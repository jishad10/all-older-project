import mongoose from "mongoose";
import Payment from "../payment/payment.model.js";
import Plan from "../plan/plan.model.js";
import User from "../auth/auth.model.js";

export const getRevenueSummaryService = async () => {
  const result = await Payment.aggregate([
    { $match: { status: "PAID" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" }
      }
    }
  ]);

  return {
    totalRevenue: result[0]?.totalRevenue || 0
  };
};

export const getRevenueListService = async ({ page = 1, limit = 10, search, status }) => {
  page = Number(page);
  limit = Number(limit);
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;

  // ✅ 1) SUM of PAID payments
  const paidAgg = await Payment.aggregate([
    { $match: { status: "PAID" } },
    { $group: { _id: null, paidPaymentsRevenue: { $sum: "$amount" } } }
  ]);
  const paidPaymentsRevenue = paidAgg?.[0]?.paidPaymentsRevenue || 0;

  // ✅ 2) SUM of plan.price from all USERS who bought a plan (role USER only)
  const planAgg = await User.aggregate([
    {
      $match: {
        role: "USER",
        "subscription.planId": { $ne: null }
      }
    },
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planId",
        foreignField: "_id",
        as: "plan"
      }
    },
    { $unwind: "$plan" },
    {
      $group: {
        _id: null,
        planRevenue: { $sum: "$plan.price" }
      }
    }
  ]);
  const planRevenue = planAgg?.[0]?.planRevenue || 0;

  // ✅ FINAL totalRevenue
  const totalRevenue = paidPaymentsRevenue + planRevenue;

  // -------- Your existing list pipeline stays same --------
  const listPipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "returnorders",
        localField: "returnOrder",
        foreignField: "_id",
        as: "returnOrder"
      }
    },
    { $unwind: { path: "$returnOrder", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "plans",
        localField: "user.subscription.planId",
        foreignField: "_id",
        as: "plan"
      }
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

    ...(search
      ? [{
          $match: {
            $or: [
              { "user.firstName": { $regex: search, $options: "i" } },
              { "user.lastName": { $regex: search, $options: "i" } },
              { "user.email": { $regex: search, $options: "i" } },
              { "user.phone": { $regex: search, $options: "i" } }
            ]
          }
        }]
      : []),

    { $sort: { createdAt: -1 } },

    {
      $project: {
        _id: 1,
        amount: 1,
        currency: 1,
        status: 1,
        createdAt: 1,

        bookingType: { $ifNull: ["$plan.title", ""] },

        user: {
          _id: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          phone: "$user.phone"
        },

        returnOrderId: "$returnOrder._id"
      }
    },

    { $skip: skip },
    { $limit: limit }
  ];

  const [items, total] = await Promise.all([
    Payment.aggregate(listPipeline),
    Payment.countDocuments(filter)
  ]);

  return {
    summary: {
      paidPaymentsRevenue,
      planRevenue,
      totalRevenue
    },
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export const getRevenueByIdService = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) return null;

  const payment = await Payment.findById(paymentId)
    .populate("user", "firstName lastName email phone subscription")
    .populate("returnOrder") // full returnOrder for view
    .lean();

  if (!payment) return null;

  let bookingType = "";
  const planId = payment?.user?.subscription?.planId;
  if (planId) {
    const plan = await Plan.findById(planId).select("title name").lean();
    bookingType = plan?.title || plan?.name || "";
  }

  return {
    _id: payment._id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,

    bookingType,

    user: payment.user,
    returnOrder: payment.returnOrder
  };
};
