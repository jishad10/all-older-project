import mongoose from "mongoose";
import RentalProperty from "./rentalProperty.model.js";
import User from "../auth/auth.model.js";
import Category from "../category/category.model.js";
import Island from "../island/island.model.js";
import { createPaginationInfo } from "../../lib/pagination.js";
import cloudinary, { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import RoleType from "../../lib/types.js";
import { createAuditLog } from "../auditLog/auditLog.helper.js";
import { buildUsdPriceRange } from "../../lib/exchangeRates.js";

const CLOUDINARY_FOLDER = "rental-properties";
const PAID_ROLES = [RoleType.LANDLORD, RoleType.AGENT];

const buildSearchFilter = async (search, date) => {
  const filter = {};

  if (search) {
    const matchingIslands = await Island.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");

    filter.$or = [
      { "basicInformation.propertyTitle": { $regex: search, $options: "i" } },
      { "address.cityTown":               { $regex: search, $options: "i" } },
      { "address.streetNumber":           { $regex: search, $options: "i" } },
      { "location.address":               { $regex: search, $options: "i" } },
      ...(matchingIslands.length
        ? [{ "address.island": { $in: matchingIslands.map(island => island._id) } }]
        : []),
    ];
  }

  if (date) {
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  }

  return filter;
};

const resolveCategory = async (value) => {
  if (!value) throw new Error("Property type (category) is required");

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Category.findById(value);
    if (byId) return byId;
  }

  const byName = await Category.findOne({
    name: { $regex: `^${value}$`, $options: "i" },
    status: "active",
  });
  if (byName) return byName;

  throw new Error("Category not found");
};

const tryResolveCategoryId = async (value) => {
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  const byName = await Category.findOne({
    name: { $regex: `^${value}$`, $options: "i" },
    status: "active",
  }).select("_id");
  return byName?._id || null;
};

const uploadPhotos = async (files = []) => {
  if (!files.length) return [];

  const uploaded = [];
  for (const file of files) {
    const publicId = `rental-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const res = await cloudinaryUpload(file.path, publicId, CLOUDINARY_FOLDER);
    if (!res || res === "file upload failed") throw new Error("Photo upload failed");
    uploaded.push({
      url:          res.secure_url,
      publicId:     res.public_id,
      originalName: file.originalname,
    });
  }
  return uploaded;
};

const deletePhotosByPublicIds = async (publicIds = []) => {
  for (const id of publicIds) {
    try { await cloudinary.uploader.destroy(id); } catch (_) {}
  }
};

/**
 * Build GeoJSON from lat/lng
 */
const buildGeoFromLatLng = (payload) => {
  if (!payload.location) {
    throw new Error("Location is required");
  }

  const { lat, lng, address } = payload.location;

  if (lat === undefined || lng === undefined) {
    throw new Error("Latitude and Longitude are required");
  }

  if (!address) {
    throw new Error("Location address is required");
  }

  payload.location.geo = {
    type: "Point",
    coordinates: [lng, lat], // MongoDB expects [lng, lat]
  };
};

/**
 * Create Rental Property
 */
export const createRentalProperty = async (payload, files, userId) => {
  /** ✅ Basic Validation */
  if (!payload?.basicInformation?.propertyTitle)
    throw new Error("Property title is required");

  if (!payload?.basicInformation?.propertyType)
    throw new Error("Property type is required");

  if (payload?.basicInformation?.monthlyRent === undefined)
    throw new Error("Monthly rent is required");

  payload.basicInformation.preferredCurrency =
    payload.basicInformation.preferredCurrency || "USD";

  if (!payload?.address?.island)
    throw new Error("Island is required");

  if (!payload?.location)
    throw new Error("Location is required");

  /** ✅ Resolve Category */
  const category = await resolveCategory(
    payload.basicInformation.propertyType
  );
  payload.basicInformation.propertyType = category._id;

  /** ✅ Build Geo Location */
  buildGeoFromLatLng(payload);

  /** ✅ User Validation */
  const user = await User.findById(userId).populate("subscription.planId");

  if (!user) throw new Error("User not found");

  /** ✅ Subscription Check */
  if (PAID_ROLES.includes(user.role)) {
    const plan = user.subscription?.planId;

    if (!plan)
      throw new Error(
        "No active plan found. Please subscribe to a plan first"
      );

    if (plan.maxProperties !== null) {
      const currentCount = await RentalProperty.countDocuments({
        createdBy: userId,
      });

      if (currentCount >= plan.maxProperties) {
        throw new Error(
          `Property limit reached. Your ${plan.name} plan allows up to ${plan.maxProperties} properties. Please upgrade your plan to add more.`
        );
      }
    }
  }

  /** ✅ Upload Photos */
  const photos = await uploadPhotos(files);

  /** ✅ Create Property */
  const doc = await RentalProperty.create({
    ...payload,
    photos,
    createdBy: userId,
    createdByRole: user.role || null,
  });

  return doc;
};

/**
 * Get all rental properties
 * Filters: search, island, status, type, date, userId (for ?mine=true)
 */
export const getAllRentalProperties = async ({
  page = 1, limit = 10, search, date, userId,
  island, status, type, listingType,
  minPrice, maxPrice, filterCurrency, bedrooms, bathrooms, petFriendly, amenities,
  userRole,
}) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = await buildSearchFilter(search, date);

  if (island) filter["address.island"] = island;

  if (userRole === "ADMIN") {
    // admin sees all statuses by default; can filter by status
    if (status) filter.status = status;
  } else if (userId) {
    // landlord/agent sees all their own listings; can filter by status
    filter.createdBy = userId;
    if (status) filter.status = status;
  } else {
    // public/user sees only active
    filter.status = "active";
  }
  if (type) {
    const categoryId = await tryResolveCategoryId(type);
    if (!categoryId) return { properties: [], paginationInfo: createPaginationInfo(numericPage, numericLimit, 0) };
    filter["basicInformation.propertyType"] = categoryId;
  }
  if (listingType) filter.listingType       = listingType;

  const priceUsdRange = await buildUsdPriceRange({
    minPrice,
    maxPrice,
    filterCurrency,
  });

  if (priceUsdRange) {
    filter["basicInformation.priceUsd"] = priceUsdRange;
  }

  if (bedrooms) {
    const n = Number(bedrooms);
    filter["propertyDetails.bedrooms"] = n >= 5 ? { $gte: 5 } : n;
  }

  if (bathrooms) {
    const n = Number(bathrooms);
    filter["propertyDetails.bathrooms"] = n >= 5 ? { $gte: 5 } : n;
  }

  if (petFriendly === "true") {
    filter["rentalTerms.additional.petFriendly"] = true;
  }

  if (amenities) {
    const list = Array.isArray(amenities) ? amenities : amenities.split(",").map((a) => a.trim());
    filter["amenities.amenities"] = { $all: list };
  }

  const total = await RentalProperty.countDocuments(filter);

  const properties = await RentalProperty.find(filter)
    .populate("address.island", "name")
    .populate("basicInformation.propertyType", "name status")
    .populate("createdBy", "firstName lastName email role")
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { properties, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


/**
 * Get single property by ID — increments view count
 */
export const getRentalPropertyById = async (id, userId = null) => {
  const property = await RentalProperty.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate("address.island", "name")
    .populate("basicInformation.propertyType", "name status")
    .populate("createdBy", "firstName lastName email role phone");

  if (!property) throw new Error("Rental property not found");

  // block public/other users from seeing disabled listings; owner can still see their own
  if (property.status === "disabled") {
    const isOwner = userId && property.createdBy._id.toString() === userId.toString();
    if (!isOwner) throw new Error("Rental property not found");
  }

  return property;
};


export const updateRentalProperty = async ({ id, payload, files, replacePhotos = false, userId, userRole }) => {
  const property = await RentalProperty.findById(id);
  if (!property) throw new Error("Rental property not found");

  if (userRole !== "ADMIN" && userId && property.createdBy.toString() !== userId.toString()) {
    throw new Error("You are not authorized to update this property");
  }

  const newPhotos = await uploadPhotos(files || []);

  if (replacePhotos && newPhotos.length) {
    const oldPublicIds = (property.photos || []).map((p) => p.publicId);
    await deletePhotosByPublicIds(oldPublicIds);
    property.photos = newPhotos;
  } else if (newPhotos.length) {
    property.photos = [...(property.photos || []), ...newPhotos];
  }

  if (payload?.basicInformation?.propertyType) {
    const category = await resolveCategory(payload.basicInformation.propertyType);
    payload.basicInformation.propertyType = category._id;
  }

  // Auto-build geo from lat/lng
  buildGeoFromLatLng(payload);

  const deepMerge = (target, source) => {
    for (const key of Object.keys(source || {})) {
      const val = source[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        target[key] = target[key] || {};
        deepMerge(target[key], val);
      } else {
        target[key] = val;
      }
    }
  };

  deepMerge(property, payload);
  await property.save();

  return RentalProperty.findById(id)
    .populate("address.island", "name")
    .populate("basicInformation.propertyType", "name status")
    .populate("createdBy", "firstName lastName email role");
};


export const deleteRentalProperty = async (id, userId) => {
  const property = await RentalProperty.findById(id);
  if (!property) throw new Error("Rental property not found");

  if (userId && property.createdBy.toString() !== userId.toString()) {
    throw new Error("You are not authorized to delete this property");
  }

  const publicIds = (property.photos || []).map((p) => p.publicId);
  await deletePhotosByPublicIds(publicIds);
  await RentalProperty.findByIdAndDelete(id);
  return true;
};


// ─────────────────────────────────────────────
// ADMIN ONLY
// ─────────────────────────────────────────────

/**
 * Admin — get all listings with filters: search, island, status, type
 */
export const adminGetAllListingsService = async ({
  page = 1, limit = 10, search, island, status, type, date, listingType,
}) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = await buildSearchFilter(search, date);

  if (island)      filter["address.island"] = island;
  if (status)      filter.status            = status;
  if (type) {
    const categoryId = await tryResolveCategoryId(type);
    if (!categoryId) return { properties: [], paginationInfo: createPaginationInfo(numericPage, numericLimit, 0) };
    filter["basicInformation.propertyType"] = categoryId;
  }
  if (listingType) filter.listingType       = listingType;

  const total = await RentalProperty.countDocuments(filter);

  const properties = await RentalProperty.find(filter)
    .populate("address.island", "name")
    .populate("basicInformation.propertyType", "name status")
    .populate("createdBy", "firstName lastName email role profileImage")
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { properties, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


/**
 * Admin — disable a listing
 */
export const disableListingService = async (id, adminId, adminEmail) => {
  const property = await RentalProperty.findById(id);
  if (!property) throw new Error("Rental property not found");
  if (property.status === "disabled") throw new Error("Property is already disabled");

  property.status = "disabled";
  await property.save();

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: "ADMIN" },
    action:  "listing_disabled",
    entity:  { type: "property", id, label: property.basicInformation?.propertyTitle || "" },
    details: {},
  });

  return property;
};


/**
 * Admin — enable a listing
 */
export const enableListingService = async (id, adminId, adminEmail) => {
  const property = await RentalProperty.findById(id);
  if (!property) throw new Error("Rental property not found");
  if (property.status === "active") throw new Error("Property is already active");

  property.status = "active";
  await property.save();

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: "ADMIN" },
    action:  "listing_enabled",
    entity:  { type: "property", id, label: property.basicInformation?.propertyTitle || "" },
    details: {},
  });

  return property;
};


/**
 * Admin — delete any listing
 */
export const adminDeleteListingService = async (id, adminId, adminEmail) => {
  const property = await RentalProperty.findById(id);
  if (!property) throw new Error("Rental property not found");

  const publicIds = (property.photos || []).map((p) => p.publicId);
  await deletePhotosByPublicIds(publicIds);
  await RentalProperty.findByIdAndDelete(id);

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: "ADMIN" },
    action:  "listing_deleted",
    entity:  { type: "property", id, label: property.basicInformation?.propertyTitle || "" },
    details: {},
  });

  return true;
};


export const getRentalPropertiesForMap = async ({
  search,
  date,
  userId,
  island,
  status,
  type,
  listingType,
  minPrice,
  maxPrice,
  filterCurrency,
  bedrooms,
  bathrooms,
  petFriendly,
  amenities,
}) => {
  const filter = await buildSearchFilter(search, date);

  /** ✅ Filters */
  if (userId) filter.createdBy = userId;
  if (island) filter["address.island"] = island;
  // owners can see all their own listings; public only sees active
  if (!userId) filter.status = "active";

  if (type) {
    const categoryId = await tryResolveCategoryId(type);
    if (!categoryId) return { pins: [] };
    filter["basicInformation.propertyType"] = categoryId;
  }

  if (listingType) filter.listingType = listingType;

  const priceUsdRange = await buildUsdPriceRange({
    minPrice,
    maxPrice,
    filterCurrency,
  });

  if (priceUsdRange) {
    filter["basicInformation.priceUsd"] = priceUsdRange;
  }

  if (bedrooms) {
    const n = Number(bedrooms);
    filter["propertyDetails.bedrooms"] = n >= 5 ? { $gte: 5 } : n;
  }

  if (bathrooms) {
    const n = Number(bathrooms);
    filter["propertyDetails.bathrooms"] = n >= 5 ? { $gte: 5 } : n;
  }

  if (petFriendly === "true") {
    filter["rentalTerms.additional.petFriendly"] = true;
  }

  if (amenities) {
    const list = Array.isArray(amenities)
      ? amenities
      : amenities.split(",").map((a) => a.trim());

    filter["amenities.amenities"] = { $all: list };
  }

  /** ✅ ONLY GEO-VALID PROPERTIES */
  filter["location.geo"] = { $exists: true };

  /** ✅ Query */
  const pins = await RentalProperty.find(filter)
    .select(
      "_id basicInformation.propertyTitle basicInformation.monthlyRent " +
        "basicInformation.preferredCurrency listingType " +
        "location address propertyDetails.bedrooms propertyDetails.bathrooms photos"
    )
    .populate("address.island", "name")
    .lean();

  /** ✅ Transform Response */
  return {
    pins: pins.map((p) => {
      const coordinates = p.location?.geo?.coordinates || [];

      return {
        _id: p._id,

        title: p.basicInformation?.propertyTitle,
        price: p.basicInformation?.monthlyRent,
        currency: p.basicInformation?.preferredCurrency,
        listingType: p.listingType,

        /** ✅ CLEAN LOCATION */
        location: {
          address: p.location?.address, // NEW FIELD USED
          lat: p.location?.lat ?? coordinates[1] ?? null,
          lng: p.location?.lng ?? coordinates[0] ?? null,
        },

        /** ✅ ADDRESS (MANUAL INPUT) */
        address: {
          street: p.address?.streetNumber,
          city: p.address?.cityTown,
          island: p.address?.island?.name,
        },

        bedrooms: p.propertyDetails?.bedrooms,
        bathrooms: p.propertyDetails?.bathrooms,

        thumbnail: p.photos?.[0]?.url ?? null,
      };
    }),
  };
};


/**
 * Admin — bulk disable listings
 */
export const bulkDisableListingsService = async (ids, adminId, adminEmail) => {
  if (!ids?.length) throw new Error('No listing IDs provided');
  const result = await RentalProperty.updateMany(
    { _id: { $in: ids }, status: { $ne: 'disabled' } },
    { $set: { status: 'disabled' } }
  );
  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'listing_disabled',
    entity:  { type: 'property', id: ids.join(','), label: `Bulk disable (${ids.length} listings)` },
    details: { count: result.modifiedCount },
  });
  return { modifiedCount: result.modifiedCount };
};


/**
 * Admin — bulk enable listings
 */
export const bulkEnableListingsService = async (ids, adminId, adminEmail) => {
  if (!ids?.length) throw new Error('No listing IDs provided');
  const result = await RentalProperty.updateMany(
    { _id: { $in: ids }, status: { $ne: 'active' } },
    { $set: { status: 'active' } }
  );
  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'listing_enabled',
    entity:  { type: 'property', id: ids.join(','), label: `Bulk enable (${ids.length} listings)` },
    details: { count: result.modifiedCount },
  });
  return { modifiedCount: result.modifiedCount };
};


/**
 * Admin — bulk delete listings
 */
export const bulkDeleteListingsService = async (ids, adminId, adminEmail) => {
  if (!ids?.length) throw new Error('No listing IDs provided');
  const result = await RentalProperty.deleteMany({ _id: { $in: ids } });
  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'listing_deleted',
    entity:  { type: 'property', id: ids.join(','), label: `Bulk delete (${ids.length} listings)` },
    details: { count: result.deletedCount },
  });
  return { deletedCount: result.deletedCount };
};