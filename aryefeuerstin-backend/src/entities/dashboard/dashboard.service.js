import User from "../auth/auth.model.js";
import RoleType from "../../lib/types.js";
import Payment from "../payment/payment.model.js";
import ReturnOrder from "../returnOrder/returnOrder.model.js";


export const getDashboardTotalsService = async () => {
  const [totalUsers, totalApprovedDrivers] = await Promise.all([
    User.countDocuments({ role: RoleType.USER }),
    User.countDocuments({
      role: RoleType.DRIVER,
      driverRequestStatus: "APPROVED"
    })
  ]);

  return { totalUsers, totalApprovedDrivers };
};


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const buildEmptyMonths = () =>
  MONTHS.map((m) => ({
    month: m,
    revenue: 0
  }));

export const getDashboardGrowthService = async ({ year }) => {
  const y = Number(year) || new Date().getFullYear();

  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y + 1, 0, 1));

  // 1️⃣ PAID payments revenue
  const paymentMonthly = await Payment.aggregate([
    {
      $match: {
        status: "PAID",
        createdAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$amount" }
      }
    }
  ]);

  // 2️⃣ Plan purchases revenue (subscription start date)
  const planMonthly = await User.aggregate([
    {
      $match: {
        role: RoleType.USER,
        "subscription.planId": { $ne: null },
        "subscription.startDate": { $gte: start, $lt: end }
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
        _id: { $month: "$subscription.startDate" },
        total: { $sum: "$plan.price" }
      }
    }
  ]);

  const months = buildEmptyMonths();

  // merge revenues
  for (const row of paymentMonthly) {
    const idx = row._id - 1;
    if (months[idx]) months[idx].revenue += Number(row.total || 0);
  }

  for (const row of planMonthly) {
    const idx = row._id - 1;
    if (months[idx]) months[idx].revenue += Number(row.total || 0);
  }

  return {
    year: y,
    items: months
  };
};


// NEW: admin return orders overview
// export const getDashboardReturnOrdersService = async ({
//   page = 1,
//   limit = 10,
//   status,
//   search
// }) => {
//   const p = Math.max(parseInt(page), 1);
//   const l = Math.max(parseInt(limit), 1);

//   const match = {};

//   // 🔹 DEFAULT BEHAVIOR (when no status filter is provided)
//   if (!status) {
//     match.status = "PENDING";
//     match.assignmentStatus = "UNASSIGNED";
//   } else {
//     // 🔹 User-provided filter
//     match.status = status;
//   }

//   // Simple text search on customer name/email/phone
//   if (search) {
//     const re = new RegExp(search, "i");
//     match.$or = [
//       { "customer.firstName": re },
//       { "customer.lastName": re },
//       { "customer.email": re },
//       { "customer.phone": re }
//     ];
//   }

//   // Main paginated list with user info
//   const pipeline = [
//     { $match: match },
//     { $sort: { createdAt: -1 } },
//     { $skip: (p - 1) * l },
//     { $limit: l },
//     {
//       $lookup: {
//         from: "users",
//         localField: "user",
//         foreignField: "_id",
//         as: "user"
//       }
//     },
//     { $unwind: "$user" },
//     {
//       $project: {
//         _id: 1,
//         status: 1,
//         paymentStatus: 1,
//         assignmentStatus: 1,
//         createdAt: 1,
//         updatedAt: 1,
//         stores: 1,
//         pricing: 1,
//         options: 1,
//         customer: 1,
//         review: 1,
//         user: {
//           _id: "$user._id",
//           firstName: "$user.firstName",
//           lastName: "$user.lastName",
//           email: "$user.email",
//           phone: "$user.phone",
//           role: "$user.role"
//         }
//       }
//     }
//   ];

//   const [items, totalOrders] = await Promise.all([
//     ReturnOrder.aggregate(pipeline),
//     ReturnOrder.countDocuments(match)
//   ]);

//   return {
//     totalOrders,
//     items,
//     pagination: {
//       page: p,
//       limit: l,
//       total: totalOrders,
//       pages: Math.ceil(totalOrders / l),
//       hasNextPage: p * l < totalOrders,
//       hasPrevPage: p > 1
//     }
//   };
// };


// export const getDashboardReturnOrdersService = async ({
//   page = 1,
//   limit = 10,
//   status,
//   search,
//   zipCode,
//   street,
//   city
// }) => {
//   const p = Math.max(parseInt(page), 1);
//   const l = Math.max(parseInt(limit), 1);

//   const match = {};

//   // 🔹 Default behavior
//   if (!status) {
//     match.status = "PENDING";
//     match.assignmentStatus = "UNASSIGNED";
//   } else {
//     match.status = status;
//   }

//   // 🔹 Text search (name/email/phone)
//   if (search) {
//     const re = new RegExp(search, "i");
//     match.$or = [
//       { "customer.firstName": re },
//       { "customer.lastName": re },
//       { "customer.email": re },
//       { "customer.phone": re }
//     ];
//   }

//   // 🔹 ADDRESS FILTERS (NEW)
//   if (zipCode) {
//     match["customer.address.zipCode"] = new RegExp(`^${zipCode}`, "i");
//   }

//   if (street) {
//     match["customer.address.street"] = new RegExp(street, "i");
//   }

//   if (city) {
//     match["customer.address.city"] = new RegExp(city, "i");
//   }

//   const pipeline = [
//     { $match: match },
//     { $sort: { createdAt: -1 } },
//     { $skip: (p - 1) * l },
//     { $limit: l },
//     {
//       $lookup: {
//         from: "users",
//         localField: "user",
//         foreignField: "_id",
//         as: "user"
//       }
//     },
//     { $unwind: "$user" },
//     {
//       $project: {
//         _id: 1,
//         status: 1,
//         paymentStatus: 1,
//         assignmentStatus: 1,
//         createdAt: 1,
//         updatedAt: 1,
//         stores: 1,
//         pricing: 1,
//         options: 1,
//         customer: 1,
//         review: 1,
//         user: {
//           _id: "$user._id",
//           firstName: "$user.firstName",
//           lastName: "$user.lastName",
//           email: "$user.email",
//           phone: "$user.phone",
//           role: "$user.role"
//         }
//       }
//     }
//   ];

//   const [items, totalOrders] = await Promise.all([
//     ReturnOrder.aggregate(pipeline),
//     ReturnOrder.countDocuments(match)
//   ]);

//   return {
//     totalOrders,
//     items,
//     pagination: {
//       page: p,
//       limit: l,
//       total: totalOrders,
//       pages: Math.ceil(totalOrders / l),
//       hasNextPage: p * l < totalOrders,
//       hasPrevPage: p > 1
//     }
//   };
// };


export const getDashboardReturnOrdersService = async ({
  page = 1,
  limit = 10,
  status,
  search,
  zipCode,
  street,
  city
}) => {
  const p = Math.max(parseInt(page), 1);
  const l = Math.max(parseInt(limit), 1);

  const match = {};

  /**
   * 🔹 Default Status Behavior
   */
  if (!status) {
    match.status = "PENDING";
    match.assignmentStatus = "UNASSIGNED";
  } else {
    match.status = status;
  }

  /**
   * 🔹 Text Search
   */
  if (search) {
    const re = new RegExp(search, "i");
    match.$or = [
      { "customer.firstName": re },
      { "customer.lastName": re },
      { "customer.email": re },
      { "customer.phone": re }
    ];
  }

  /**
   * 🔹 Address Filters
   */
  if (zipCode) {
    match["customer.address.zipCode"] = new RegExp(`^${zipCode}`, "i");
  }

  if (street) {
    match["customer.address.street"] = new RegExp(street, "i");
  }

  if (city) {
    match["customer.address.city"] = new RegExp(city, "i");
  }

  /**
   * 🔥 PAYMENT VISIBILITY LOGIC
   *
   * Show only:
   * 1) Free orders (totalAmount === 0 AND paymentStatus === "PENDING")
   * 2) Paid orders (totalAmount > 0 AND paymentStatus === "PAID")
   */
  match.$and = [
    {
      $or: [
        {
          "pricing.totalAmount": 0,
          paymentStatus: "PENDING"
        },
        {
          "pricing.totalAmount": { $gt: 0 },
          paymentStatus: "PAID"
        }
      ]
    }
  ];

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: (p - 1) * l },
    { $limit: l },
    {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },

  // 🔥 PLAN POPULATE
  {
    $lookup: {
      from: "plans",
      localField: "user.subscription.planId",
      foreignField: "_id",
      as: "plan"
    }
  },
  {
    $unwind: {
      path: "$plan",
      preserveNullAndEmptyArrays: true
    }
  },

  {
    $project: {
      _id: 1,
      status: 1,
      paymentStatus: 1,
      assignmentStatus: 1,
      createdAt: 1,
      updatedAt: 1,
      stores: 1,
      pricing: 1,
      options: 1,
      customer: 1,
      review: 1,
      user: {
        _id: "$user._id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        phone: "$user.phone",
        role: "$user.role",
        subscription: {
          startDate: "$user.subscription.startDate",
          endDate: "$user.subscription.endDate",
          plan: "$plan"
        }
      }
    }
  }
  ];

  const [items, totalOrders] = await Promise.all([
    ReturnOrder.aggregate(pipeline),
    ReturnOrder.countDocuments(match)
  ]);

  return {
    totalOrders,
    items,
    pagination: {
      page: p,
      limit: l,
      total: totalOrders,
      pages: Math.ceil(totalOrders / l),
      hasNextPage: p * l < totalOrders,
      hasPrevPage: p > 1
    }
  };
};
