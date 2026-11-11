import mongoose from 'mongoose';
import User from '../auth/auth.model.js';
import Plan from './plan.model.js';

export const createPlanService = async (payload) => {
  const exists = await Plan.findOne({ name: payload.name });
  if (exists) {
    throw new Error("Plan with this name already exists");
  }

  const doc = await Plan.create(payload);
  return doc.toObject();
};


export const getPlansService = async ({
  page = 1,
  limit = 10,
  search,
  status
}) => {
  const p = Math.max(parseInt(page), 1);
  const l = Math.max(parseInt(limit), 1);

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { title: new RegExp(search, 'i') }
    ];
  }

  const pipeline = [
    { $match: filter },

    { $sort: { createdAt: 1 } },
    { $skip: (p - 1) * l },
    { $limit: l },

    // 🔥 Lookup users who subscribed to this plan
    {
      $lookup: {
        from: "users",
        let: { planId: "$_id" },
        pipeline: [
          { 
            $match: { 
              $expr: { $eq: ["$subscription.planId", "$$planId"] }
            }
          }
        ],
        as: "subscribers"
      }
    },

    // Count subscribers
    {
      $addFields: {
        totalSubscribers: { $size: "$subscribers" }
      }
    },

    // Remove subscriber list
    {
      $project: {
        subscribers: 0
      }
    }
  ];

  const items = await Plan.aggregate(pipeline);
  const total = await Plan.countDocuments(filter);

  return {
    items,
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l)
    }
  };
};


// export const getPlansService = async ({
//   page = 1,
//   limit = 10,
//   search,
//   status
// }) => {
//   const p = Math.max(parseInt(page), 1);
//   const l = Math.max(parseInt(limit), 1);

//   const filter = {};
//   if (status) filter.status = status;
//   if (search) {
//     filter.$or = [
//       { name: new RegExp(search, 'i') },
//       { title: new RegExp(search, 'i') }
//     ];
//   }

//   const [items, total] = await Promise.all([
//     Plan.find(filter)
//       .sort({ createdAt: -1 })
//       .skip((p - 1) * l)
//       .limit(l)
//       .lean(),
//     Plan.countDocuments(filter)
//   ]);

//   return {
//     items,
//     pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) }
//   };
// };

export const getPlanByIdService = async (id) => {
  return await Plan.findById(id).lean();
};

export const updatePlanService = async (id, payload) => {
  return await Plan.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();
};

export const deletePlanService = async (id) => {
  return await Plan.findByIdAndDelete(id).lean();
};


export const getRecentTransactionsService = async () => {

  const pipeline = [
    // Only users who ever subscribed
    {
      $match: {
        "subscription.planId": { $ne: null }
      }
    },

    // Join with the Plan collection to get billingCycle + price
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planId",
        foreignField: "_id",
        as: "planData"
      }
    },

    { $unwind: "$planData" },

    // Sort by newest subscription
    {
      $sort: {
        "subscription.startDate": -1
      }
    },

    // Select required fields only
    {
      $project: {
        _id: 0,
        name: 1,
        billingCycle: "$planData.billingCycle",
        price: "$planData.price",
        startDate: "$subscription.startDate",
        hasActiveSubscription: 1
      }
    }
  ];

  const result = await User.aggregate(pipeline);
  return result;
};


export const getRecentTransactionByIdService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
        "subscription.planId": { $ne: null }
      }
    },
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planId",
        foreignField: "_id",
        as: "planData"
      }
    },
    { $unwind: "$planData" },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        hasActiveSubscription: 1,

        // subscription
        subscription: {
          planId: "$subscription.planId",
          startDate: "$subscription.startDate",
          endDate: "$subscription.endDate"
        },

        // plan details
        plan: {
          name: "$planData.name",
          billingCycle: "$planData.billingCycle",
          price: "$planData.price",
          title: "$planData.title",
          displayFeatures: {
            $ifNull: ["$planData.displayFeatures", "$planData.features"]
          },
          status: "$planData.status",
          emailNotifications: "$planData.emailNotifications",
          searchLimit: "$planData.searchLimit",
          favoritesEnabled: "$planData.favoritesEnabled"
        }
      }
    }
  ];

  const result = await User.aggregate(pipeline);
  return result[0] || null;
};

export const getMembershipsService = async ({ page = 1, limit = 10, search, status, planId }) => {
  const p = Math.max(parseInt(page), 1);
  const l = Math.max(parseInt(limit), 1);

  const match = {
    "subscription.planId": { $ne: null }
  };

  // filter active/inactive (based on hasActiveSubscription)
  if (status === "active") match.hasActiveSubscription = true;
  if (status === "inactive") match.hasActiveSubscription = false;

  // filter by planId
  if (planId && mongoose.Types.ObjectId.isValid(planId)) {
    match["subscription.planId"] = new mongoose.Types.ObjectId(planId);
  }

  // search user by name/email/phone
  if (search) {
    const re = new RegExp(search, "i");
    match.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  const pipeline = [
    { $match: match },

    // join plan info
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planId",
        foreignField: "_id",
        as: "plan"
      }
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

    // latest first
    { $sort: { "subscription.startDate": -1 } },

    // pagination
    { $skip: (p - 1) * l },
    { $limit: l },

    // shape output for UI table
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        hasActiveSubscription: 1,
        startDate: "$subscription.startDate",
        endDate: "$subscription.endDate",
        membershipType: {
          $ifNull: ["$plan.title", "$plan.name"]
        },
        billingCycle: "$plan.billingCycle",
        price: "$plan.price",
      }
    }
  ];

  const [items, total] = await Promise.all([
    User.aggregate(pipeline),
    User.countDocuments(match)
  ]);

  return {
    items,
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l)
    }
  };
};
