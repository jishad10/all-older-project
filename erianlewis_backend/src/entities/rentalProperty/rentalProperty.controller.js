import { generateResponse } from "../../lib/responseFormate.js";
import RoleType from "../../lib/types.js";
import {
  createRentalProperty,
  deleteRentalProperty,
  getAllRentalProperties,
  getRentalPropertyById,
  updateRentalProperty,
  adminGetAllListingsService,
  disableListingService,
  enableListingService,
  adminDeleteListingService,
  bulkDisableListingsService,
  bulkEnableListingsService,
  bulkDeleteListingsService,
  getRentalPropertiesForMap,
} from "./rentalProperty.service.js";

const parseBodyIfNeeded = (body) => {
  const parsed = { ...body };

  const maybeJsonFields = [
    "basicInformation", "address", "location", "propertyDetails",
    "rentalTerms", "amenities", "financials", "propertyFeatures",
    "utilitiesInfrastructure", "unitDetails",
  ];

  for (const field of maybeJsonFields) {
    if (typeof parsed[field] === "string") {
      try { parsed[field] = JSON.parse(parsed[field]); } catch (_) {}
    }
  }

  if (parsed.propertyTaxAnnual !== undefined) {
    const n = Number(parsed.propertyTaxAnnual);
    parsed.propertyTaxAnnual = Number.isNaN(n) ? 0 : n;
  }

  return parsed;
};


export const createRentalPropertyController = async (req, res) => {
  try {
    const payload = parseBodyIfNeeded(req.body);
    const userId = req.user._id;

    const property = await createRentalProperty(
      payload,
      req.files || [],
      userId
    );

    generateResponse(
      res,
      201,
      true,
      "Rental property created successfully",
      property
    );
  } catch (error) {
    const status = error.message.includes("limit reached") ? 403 : 400;

    generateResponse(
      res,
      status,
      false,
      error.message || "Failed to create rental property",
      null
    );
  }
};


export const getAllRentalPropertiesController = async (req, res) => {
  try {
    const {
      page, limit, search, date, island, status,
      type, listingType, minPrice, maxPrice, bedrooms,
      bathrooms, petFriendly, amenities, filterCurrency,
    } = req.query;

    const user = req.user; // set by optionalAuth — undefined if guest

    // LANDLORD / AGENT -> only their own listings
    // ADMIN / USER / guest -> all listings
    const userId =
      user && [RoleType.LANDLORD, RoleType.AGENT].includes(user.role)
        ? user._id
        : undefined;

    const userRole = user?.role;

    const data = await getAllRentalProperties({
      page, limit, search, date, userId, island, status,
      type, listingType, minPrice, maxPrice, bedrooms,
      bathrooms, petFriendly, amenities, filterCurrency, userRole,
    });
    generateResponse(res, 200, true, "Rental properties fetched successfully, ci/cd", data);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch rental properties", null);
  }
};


export const getRentalPropertyByIdController = async (req, res) => {
  try {
    const property = await getRentalPropertyById(req.params.id, req.user?._id);
    generateResponse(res, 200, true, "Rental property fetched successfully", property);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 500;
    generateResponse(res, status, false, error.message || "Failed to fetch rental property", null);
  }
};


export const updateRentalPropertyController = async (req, res) => {
  try {
    const { id }        = req.params;
    const replacePhotos = String(req.query.replacePhotos || "false") === "true";
    const payload       = parseBodyIfNeeded(req.body);
    const userId        = req.user._id;
    const userRole      = req.user.role;

    const property = await updateRentalProperty({ id, payload, files: req.files || [], replacePhotos, userId, userRole });
    generateResponse(res, 200, true, "Rental property updated successfully", property);
  } catch (error) {
    const status = error.message.includes("not found")     ? 404
                 : error.message.includes("not authorized") ? 403
                 : 400;
    generateResponse(res, status, false, error.message || "Failed to update rental property", null);
  }
};


export const deleteRentalPropertyController = async (req, res) => {
  try {
    const userId = req.user._id;
    await deleteRentalProperty(req.params.id, userId);
    generateResponse(res, 200, true, "Rental property deleted successfully", null);
  } catch (error) {
    const status = error.message.includes("not found")     ? 404
                 : error.message.includes("not authorized") ? 403
                 : 500;
    generateResponse(res, status, false, error.message || "Failed to delete rental property", null);
  }
};


// ADMIN

export const adminGetAllListingsController = async (req, res, next) => {
  try {
    const { page, limit, search, island, status, type, date, listingType } = req.query;
    const data = await adminGetAllListingsService({ page, limit, search, island, status, type, date, listingType });
    generateResponse(res, 200, true, "Listings fetched successfully", data);
  } catch (error) { next(error); }
};


export const disableListingController = async (req, res, next) => {
  try {
    const data = await disableListingService(req.params.id, req.user._id, req.user.email);
    generateResponse(res, 200, true, "Listing disabled", data);
  } catch (error) {
    if (error.message === "Rental property not found")    return generateResponse(res, 404, false, error.message, null);
    if (error.message === "Property is already disabled") return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const enableListingController = async (req, res, next) => {
  try {
    const data = await enableListingService(req.params.id, req.user._id, req.user.email);
    generateResponse(res, 200, true, "Listing enabled", data);
  } catch (error) {
    if (error.message === "Rental property not found")  return generateResponse(res, 404, false, error.message, null);
    if (error.message === "Property is already active") return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const adminDeleteListingController = async (req, res, next) => {
  try {
    await adminDeleteListingService(req.params.id, req.user._id, req.user.email);
    generateResponse(res, 200, true, "Listing deleted", null);
  } catch (error) {
    if (error.message === "Rental property not found") return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const getRentalPropertiesForMapController = async (req, res) => {
  try {
    const {
      search,
      date,
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
    } = req.query;

    const user = req.user;

    const userId =
      user && [RoleType.LANDLORD, RoleType.AGENT].includes(user.role)
        ? user._id
        : undefined;

    const data = await getRentalPropertiesForMap({
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
    });

    generateResponse(res, 200, true, "Map pins fetched successfully", data);
  } catch (error) {
    console.error("Map Fetch Error:", error);
    generateResponse(res, 500, false, "Failed to fetch map pins", null);
  }
};


export const bulkDisableListingsController = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkDisableListingsService(ids, req.user._id, req.user.email);
    generateResponse(res, 200, true, `${data.modifiedCount} listing(s) disabled successfully`, data);
  } catch (error) {
    const status = error.message === 'No listing IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};

export const bulkEnableListingsController = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkEnableListingsService(ids, req.user._id, req.user.email);
    generateResponse(res, 200, true, `${data.modifiedCount} listing(s) enabled successfully`, data);
  } catch (error) {
    const status = error.message === 'No listing IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};

export const bulkDeleteListingsController = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkDeleteListingsService(ids, req.user._id, req.user.email);
    generateResponse(res, 200, true, `${data.deletedCount} listing(s) deleted successfully`, data);
  } catch (error) {
    const status = error.message === 'No listing IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};