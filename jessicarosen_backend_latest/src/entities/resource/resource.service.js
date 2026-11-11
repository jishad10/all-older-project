import mongoose from "mongoose";
import Review from "../review/review.model.js";
import Resource from "./resource.model.js";
import Order from "../Payment/order.model.js";
import User from "../auth/auth.model.js";


export const createResourceService = async (data) => {
  
  const resource = new Resource(data);
  return await resource.save();
};


export const getAllResourcesService = async (
  page,
  limit,
  skip,
  status,
  sellerId,
  resourceType,
  price,
  practiceAreas,
  subPracticeAreas,
  fileType,
  search,
  country,
  states,
  divisions,
  formatArray,
  sortedBy
) => {
  const query = sellerId ? { createdBy: sellerId } : {};


  if (status) query.status = new RegExp(`^${status}$`, "i");
  if (fileType) query["file.type"] = new RegExp(`^${fileType}$`, "i");
  if (price) query.discountPrice = { $gte: parseInt(price[0]), $lte: parseInt(price[1]) };
  if (country) query.country = new RegExp(`^${country}$`, "i");
  if (states) query.states = { $in: states.map(s => new RegExp(`^${s}$`, "i")) };
  if (divisions) query.divisions = { $in: divisions.map(d => new RegExp(`^${d}$`, "i")) };

  if (practiceAreas) {
    query.practiceAreas = Array.isArray(practiceAreas)
      ? { $in: practiceAreas.map(p => new RegExp(`^${p}$`, "i")) }
      : new RegExp(`^${practiceAreas}$`, "i");
  }
  if (subPracticeAreas) {
    query.subPracticeAreas = Array.isArray(subPracticeAreas)
      ? { $in: subPracticeAreas.map(p => new RegExp(`^${p}$`, "i")) }
      : new RegExp(`^${subPracticeAreas}$`, "i");
  }

  if (resourceType) {
    query.resourceType = Array.isArray(resourceType)
      ? { $in: resourceType.map(t => new RegExp(`^${t}$`, "i")) }
      : new RegExp(`^${resourceType}$`, "i");
  }

  if (formatArray) {
    query.format = Array.isArray(formatArray)
      ? { $in: formatArray.map(f => new RegExp(`^${f}$`, "i")) }
      : new RegExp(`^${formatArray}$`, "i");
  }

  const baseResources = await Resource.find(query)
    .select("-__v -updatedAt")
    .populate("createdBy", "firstName lastName email profileImage")
    .sort({ createdAt: -1 })
    .lean();

  const filteredResources = baseResources.filter(resource => {
    const title = resource.title?.toLowerCase() || "";
    const desc = resource.description?.toLowerCase() || "";
    const areas = resource.practiceAreas?.map(a => a.toLowerCase()) || [];
    const subAreas = resource.subPracticeAreas?.map(a => a.toLowerCase()) || [];
    const types = resource.resourceType?.map(t => t.toLowerCase()) || [];
    const format = resource.format?.toLowerCase() || "";
    const key = search?.toLowerCase();

    if (!key) return true;
    return (
      title.includes(key) ||
      desc.includes(key) ||
      subAreas.some(a => a.includes(key)) ||
      areas.some(a => a.includes(key)) ||
      types.some(t => t.includes(key)) ||
      format.includes(key)
    );
  });


  // Attach averageRating & totalReviews
  const modifiedResources = await Promise.all(
    filteredResources.map(async (resource) => {
      const [ratingData] = await Review.aggregate([
        { $match: { resourceId: new mongoose.Types.ObjectId(resource._id) } },
        {
          $group: {
            _id: "$resourceId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      return {
        ...resource,
        averageRating: ratingData?.averageRating || 0,
        totalReviews: ratingData?.totalReviews || 0,
      };
    })
  );

  let finalResources = [...modifiedResources];

  switch (sortedBy?.toLowerCase()) {
    case "rating": {
      const topRated = await Review.aggregate([
        { $group: {
            _id: "$resourceId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 }
        }},
        { $sort: { averageRating: -1, reviewCount: -1 } }
      ]);
      const ratingMap = new Map(topRated.map(r => [r._id.toString(), r.averageRating]));
      finalResources.sort((a, b) => (ratingMap.get(b._id.toString()) || 0) - (ratingMap.get(a._id.toString()) || 0));
      break;
    }

    case "best reviewed":
      finalResources.sort((a, b) => b.averageRating - a.averageRating);
      break;

    case "most recent":
      finalResources.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;

    case "best sellers(products)": {
      const productSales = await Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.resource",
            totalSold: { $sum: "$items.quantity" }
          }
        }
      ]);

      const salesMap = new Map(productSales.map(p => [p._id.toString(), p.totalSold]));

      // Add totalSold field to each resource
      finalResources = finalResources.map(resource => ({
        ...resource,
        totalSold: salesMap.get(resource._id.toString()) || 0
      }));

      finalResources.sort((a, b) => b.totalSold - a.totalSold);
      break;
    }

    case "best sellers(people)": {
      const sellerSales = await Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        { $group: { _id: "$items.seller", totalSold: { $sum: "$items.quantity" } } }
      ]);
      const sellerSalesMap = new Map(sellerSales.map(s => [s._id.toString(), s.totalSold]));
      finalResources.sort((a, b) => {
        const salesA = sellerSalesMap.get(a.createdBy?._id?.toString() || "") || 0;
        const salesB = sellerSalesMap.get(b.createdBy?._id?.toString() || "") || 0;
        return salesB - salesA;
      });
      break;
    }

    case "relevance": {
      if (search) {
        const words = search.toLowerCase().split(" ");
        const relevanceScore = res => words.reduce((score, word) => {
          const title = res.title.toLowerCase();
          const desc = res.description.toLowerCase();
          const areas = (res.practiceAreas || []).map(p => p.toLowerCase());
          return score +
            (title.includes(word) ? 3 : 0) +
            (desc.includes(word) ? 2 : 0) +
            (areas.some(a => a.includes(word)) ? 1 : 0);
        }, 0);
        finalResources.sort((a, b) => relevanceScore(b) - relevanceScore(a));
      } else {
        finalResources.sort((a, b) => {
          const intersect = (a.practiceAreas || []).filter(val => (b.practiceAreas || []).includes(val));
          return intersect.length > 0 ? -1 : 1;
        });
      }
      break;
    }
  }

  const totalItems = finalResources.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedResources = finalResources.slice(skip, skip + limit);

  return {
    data: paginatedResources,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    },
  };
};


export const getSellerProfileResourcesService = async (
  sellerId,
  page,
  limit,
  skip,
  status,
  resourceTypeArray,
  priceRange,
  practiceAreasArray,
  subPracticeAreasArray,
  fileType,
  search,
  country,
  statesArray,
  divisionsArray,
  formatArray,
  sortedBy
) => {
  try {
    const match = {
      createdBy: sellerId,
      ...(status && { status }),
      ...(resourceTypeArray?.length > 0 && { resourceType: { $in: resourceTypeArray } }),
      ...(priceRange && { price: { $gte: priceRange[0], $lte: priceRange[1] } }),
      ...(practiceAreasArray?.length > 0 && { practiceAreas: { $in: practiceAreasArray } }),
      ...(subPracticeAreasArray?.length > 0 && { subPracticeAreas: { $in: subPracticeAreasArray } }),
      ...(fileType && { "file.type": fileType }),
      ...(search && { $text: { $search: search } }),
      ...(country && { country }),
      ...(statesArray?.length > 0 && { states: { $in: statesArray } }),
      ...(divisionsArray?.length > 0 && { divisions: { $in: divisionsArray } }),
      ...(formatArray?.length > 0 && { format: { $in: formatArray } }),
    };

    // Fetch resources
    const resources = await Resource.find(match)
      .skip(skip)
      .limit(limit)
      .sort(sortedBy ? { [sortedBy]: 1 } : { createdAt: -1 })
      .lean();

    const totalItems = await Resource.countDocuments(match);

    // Fetch seller profile with followers
    const sellerProfile = await User.findById(sellerId).select(
      "firstName lastName phoneNumber email profileImage gender bio isVerified address createdAt followers about"
    );

    // --- Get resourceIds for this seller ---
    const resourceIds = await Resource.find({ createdBy: sellerId }).distinct("_id");

    // --- Aggregate reviews for these resources ---
    const reviewStats = await Review.aggregate([
      { $match: { resourceId: { $in: resourceIds } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const avgRating = reviewStats.length > 0 ? reviewStats[0].avgRating : 0;
    const ratingCount = reviewStats.length > 0 ? reviewStats[0].ratingCount : 0;

    return {
      sellerProfile: {
        ...sellerProfile.toObject(),
        avgRating: avgRating.toFixed(1), 
        ratingCount,
      },
      data: resources,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  } catch (error) {
    throw new Error("Error fetching seller resources: " + error.message);
  }
};


export const getResourceByIdService = async (id, page, limit, skip) => {
  const resource = await Resource.findById(id)
    .select("-__v -updatedAt")
    .populate("createdBy", "firstName lastName email profileImage")
    .lean();

  if (!resource) throw new Error("Resource not found");

  const [reviewInfo, reviews] = await Promise.all([
    Review.aggregate([
      { $match: { resourceId: new mongoose.Types.ObjectId(resource._id) } },
      {
        $group: {
          _id: "$resourceId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]),
    Review.find({ resourceId: resource._id })
      .select("-__v -updatedAt -resourceId")
      .populate("userId", "firstName lastName email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const totalReviews = reviewInfo[0]?.totalReviews || 0;

  resource.averageRating = reviewInfo[0]?.averageRating || 0;
  resource.totalReviews = totalReviews;
  resource.reviews = reviews;

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(totalReviews / limit),
    totalItems: totalReviews,
    itemsPerPage: limit
  };

  return {
    data: resource,
    pagination
  };
};


export const updateResourceService = async (id, updateData, user) => {
  const resource = await Resource.findById(id);
  if (!resource) throw new Error("Resource not found");

  if (user.role === "SELLER") {
    if (resource.createdBy.toString() !== user._id.toString()) {
      throw new Error("Sellers can only update their own resources");
    }

    if (updateData.status !== undefined) {
      throw new Error("Only admin can update the status of a resource");
    }
  }

  if (user.role !== "ADMIN" && updateData.status !== undefined) {
    delete updateData.status;
  }

  const updated = await Resource.findByIdAndUpdate(id, updateData, { new: true });
  return updated;
};


export const deleteResourceService = async (id, user) => {
  const resource = await Resource.findById(id);
  if (!resource) throw new Error("Resource not found or already deleted");

  if (user.role === "ADMIN") {
    await resource.deleteOne();
    return resource;
  }

  if (user.role === "SELLER") {
    if (!resource.createdBy.equals(user._id)) {
      throw new Error("Sellers can only delete their own resources");
    }
    await resource.deleteOne();
    return resource;
  }

  throw new Error("Unauthorized role");
};


export const getSellerResourcesService = async (myId) => {
  try {
    return await Resource.find({ createdBy: myId }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error("Error fetching seller resources: " + error.message);
  }
};


export const getTopSellingResources = async (country, limit = 10) => {
  const pipeline = [
    { $unwind: "$items" },

    // Lookup the resource
    {
      $lookup: {
        from: "resources",
        localField: "items.resource",
        foreignField: "_id",
        as: "resource",
      },
    },
    { $unwind: "$resource" },

    // Filter by country and approved status
    {
      $match: {
        "resource.country": country,
        "resource.status": "approved",
      },
    },

    // Group by resource ID and sum quantity sold
    {
      $group: {
        _id: "$resource._id",
        totalSold: { $sum: "$items.quantity" },
        resource: { $first: "$resource" },
      },
    },

    // Sort by total sold descending
    { $sort: { totalSold: -1 } },

    // Limit result count
    { $limit: limit },

    // Final project
    {
      $project: {
        _id: 0,
        resource: 1,
        totalSold: 1,
      },
    },
  ];

  const topSelling = await Order.aggregate(pipeline);

  const populated = await Resource.populate(topSelling, {
    path: "resource.createdBy resource.category resource.subCategory",
  });

  return populated;
};



export const getMostPopularResources = async (country, limit = 10) => {
  const resources = await Resource.aggregate([
    {
      $match: {
        country,
        status: 'approved',
      },
    },
    // Lookup average rating from reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'resourceId',
        as: 'reviews',
      },
    },
    {
      $addFields: {
        averageRating: { $avg: '$reviews.rating' },
      },
    },
    // Lookup total sold count from orders
    {
      $lookup: {
        from: 'orders',
        let: { resourceId: '$_id' },
        pipeline: [
          { $unwind: '$items' },
          {
            $match: {
              $expr: { $eq: ['$items.resource', '$$resourceId'] },
            },
          },
          {
            $group: {
              _id: null,
              totalSold: { $sum: '$items.quantity' },
            },
          },
        ],
        as: 'soldData',
      },
    },
    {
      $addFields: {
        soldCount: {
          $ifNull: [{ $arrayElemAt: ['$soldData.totalSold', 0] }, 0],
        },
      },
    },
    // Calculate popularity score
    {
      $addFields: {
        popularityScore: {
          $multiply: [
            { $ifNull: ['$averageRating', 0] },
            { $ifNull: ['$soldCount', 0] },
          ],
        },
      },
    },
    {
      $sort: { popularityScore: -1 },
    },
    { $limit: limit },
    // Populate createdBy only
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
      },
    },
    { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        reviews: 0,
        soldData: 0,
      },
    },
  ]);

  return resources;
};

