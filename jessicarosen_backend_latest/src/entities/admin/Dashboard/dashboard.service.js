import User from "../../auth/auth.model.js";
import Order from "../../Payment/order.model.js";
import Resource from "../../resource/resource.model.js";


export const getAdminDashboardSummaryService = async (adminId) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // ---------- Total Revenue ----------
    const totalRevenueAgg = await Order.aggregate([
        { $unwind: "$items" },
        { $match: { paymentStatus: "paid" } },
        {
        $group: {
            _id: null,
            totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        }
    ]);

    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;


    // ---------- Admin Own Revenue ----------
    const ownRevenueAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            paymentStatus: "paid",
            "items.seller": adminId
        }
        },
        {
        $group: {
            _id: null,
            ownRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        }
    ]);

    const ownRevenue = ownRevenueAgg[0]?.ownRevenue || 0;

    // ---------- Live Products ----------
    const liveProducts = await Resource.countDocuments({ status: "approved" });

    // ---------- Total Sellers ----------
    const totalSellers = await User.countDocuments({ role: "SELLER" });

    // ---------- Total Users ----------
    const totalUsers = await User.countDocuments({ role: "USER" });

    // ---------- Product Sell by Practice Area (All Sellers) ----------
    const productSellAgg = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
        $lookup: {
        from: "resources",
        localField: "items.resource",
        foreignField: "_id",
        as: "resourceInfo"
        }
    },
    { $unwind: "$resourceInfo" },
    { $unwind: "$resourceInfo.practiceAreas" },
    {
        $group: {
        _id: "$resourceInfo.practiceAreas",
        totalSold: { $sum: "$items.quantity" }
        }
    },
    { $sort: { totalSold: -1 } }
    ]);

    const totalQuantity = productSellAgg.reduce((sum, item) => sum + item.totalSold, 0);

    const productSell = productSellAgg.map(item => ({
    name: item._id,
    percentage: totalQuantity
        ? Math.round((item.totalSold / totalQuantity) * 100)
        : 0
    }));



    // ---------- New Products ----------
    const startOfDay = new Date(currentYear, now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const startOfYear = new Date(currentYear, 0, 1);

    const countProducts = async (start) => {
        return await Resource.countDocuments({
        createdAt: { $gte: start }
        });
    };

    const newProducts = {
        thisDay: await countProducts(startOfDay),
        thisWeek: await countProducts(startOfWeek),
        thisMonth: await countProducts(startOfMonth),
        thisYear: await countProducts(startOfYear),
    };

    return {
        totalRevenue,
        ownRevenue,
        liveProducts,
        totalSellers,
        totalUsers,
        newProducts,
        productSell
    };
};



export const getAdminOwnRevenueReportService = async (adminId, filter = "month") => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate;
    let unit;
    let range = [];

    if (filter === "day") {
        unit = "day";
        startDate = new Date(currentYear, currentMonth, now.getDate());
        range = [{ date: formatDate(startDate), revenue: 0 }];
    } 
    else if (filter === "week") {
        unit = "day";
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startDate = startOfWeek;

        const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        range.push({
            day: weekDayNames[date.getDay()],
            key: formatDate(date),
            revenue: 0
        });
        }
    } 
    else if (filter === "month") {
        unit = "month";
        startDate = new Date(currentYear, 0, 1);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        range.push({ month: monthNames[i], key: formatMonth(date), revenue: 0 });
        }
    } 
    else {
        throw new Error("Invalid filter. Use one of: day, week, month");
    }

    const format = unit === "month" ? "%Y-%m" : "%Y-%m-%d";

    const agg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            "items.seller": adminId,
            paymentStatus: "paid",
            createdAt: { $gte: startDate }
        }
        },
        {
        $group: {
            _id: { date: { $dateToString: { format, date: "$createdAt" } } },
            total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
        },
        { $sort: { "_id.date": 1 } }
    ]);

    const aggMap = new Map(agg.map(i => [i._id.date, Math.round(i.total)]));

    let final;
    if (filter === "month") {
        final = range.map(item => ({
        month: item.month,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else if (filter === "week") {
        final = range.map(item => ({
        day: item.day,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else {
        final = range.map(item => ({
        date: item.date,
        revenue: aggMap.get(item.date) || 0
        }));
    }

    return final;
};


// Utility functions
const formatDate = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD
const formatMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;



export const getTotalRevenueReportService = async (filter = "month") => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate;
    let unit;
    let range = [];

    if (filter === "day") {
        unit = "day";
        startDate = new Date(currentYear, currentMonth, now.getDate());
        range = [{ date: formatDate(startDate), revenue: 0 }];
    } 
    else if (filter === "week") {
        unit = "day";
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startDate = startOfWeek;

        const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        range.push({
            day: weekDayNames[date.getDay()],
            key: formatDate(date),
            revenue: 0
        });
        }
    } 
    else if (filter === "month") {
        unit = "month";
        startDate = new Date(currentYear, 0, 1);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        range.push({ month: monthNames[i], key: formatMonth(date), revenue: 0 });
        }
    } 
    else {
        throw new Error("Invalid filter. Use one of: day, week, month");
    }

    const format = unit === "month" ? "%Y-%m" : "%Y-%m-%d";

    const agg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startDate }
        }
        },
        {
        $group: {
            _id: { date: { $dateToString: { format, date: "$createdAt" } } },
            total: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        },
        { $sort: { "_id.date": 1 } }
    ]);

    const aggMap = new Map(agg.map(i => [i._id.date, Math.round(i.total)]));

    let final;
    if (filter === "month") {
        final = range.map(item => ({
        month: item.month,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else if (filter === "week") {
        final = range.map(item => ({
        day: item.day,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else {
        final = range.map(item => ({
        date: item.date,
        revenue: aggMap.get(item.date) || 0
        }));
    }

    return final;
};



export const getAdminSalesHistoryService = async (
  adminId,
  search = '',
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;

  // Base pipeline: paid orders with items from this admin (as seller)
  const basePipeline = [
    {
      $match: {
        paymentStatus: 'paid',
        'items.seller': adminId
      }
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.seller': adminId
      }
    },
    // Join with resources to get product details
    {
      $lookup: {
        from: 'resources',
        localField: 'items.resource',
        foreignField: '_id',
        as: 'items.resourceDoc'
      }
    },
    { $unwind: '$items.resourceDoc' },

    // Optional search on productId
    ...(search
      ? [{
          $match: {
            'items.resourceDoc.productId': { $regex: search, $options: 'i' }
          }
        }]
      : []
    ),

    // Final projection: full order + item + product
    {
      $project: {
        orderId: '$_id',
        createdAt: '$createdAt',
        totalAmount: '$totalAmount',
        paymentStatus: '$paymentStatus',
        orderStatus: '$orderStatus',
        item: {
          quantity: '$items.quantity',
          price: '$items.price',
          sellerAmount: {
            $divide: [
              { $multiply: ['$items.price', '$items.quantity'] },
              2
            ]
          },
          product: {
            productId: '$items.resourceDoc.productId',
            title: '$items.resourceDoc.title',
            image: { $arrayElemAt: ['$items.resourceDoc.images', 0] }, // adjust if needed
            // Add more: slug, category, etc.
          }
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  // Count pipeline (same filters, no pagination)
  const countPipeline = [
    {
      $match: {
        paymentStatus: 'paid',
        'items.seller': adminId
      }
    },
    { $unwind: '$items' },
    { $match: { 'items.seller': adminId } },
    {
      $lookup: {
        from: 'resources',
        localField: 'items.resource',
        foreignField: '_id',
        as: 'items.resourceDoc'
      }
    },
    { $unwind: '$items.resourceDoc' },
    ...(search
      ? [{
          $match: {
            'items.resourceDoc.productId': { $regex: search, $options: 'i' }
          }
        }]
      : []
    ),
    { $count: 'total' }
  ];

  const [data, countResult] = await Promise.all([
    Order.aggregate(basePipeline),
    Order.aggregate(countPipeline)
  ]);

  const totalItems = countResult[0]?.total || 0;

  return {
    success: true,
    message: 'Admin sales history fetched',
    data,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: Number(limit)
    }
  };
};



export const getRevenueFromSellerService = async (page = 1, limit = 10) => {
  const basePipeline = [
    { $unwind: "$items" },
    {
      $match: {
        paymentStatus: "paid"
      }
    },
    {
      $group: {
        _id: {
          seller: "$items.seller",
          resource: "$items.resource"
        },
        amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      }
    },
    {
      $project: {
        sellerId: "$_id.seller",
        resourceId: "$_id.resource",
        revenueFromSeller: { $divide: ["$amount", 2] },
        _id: 0
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "sellerId",
        foreignField: "_id",
        as: "sellerInfo"
      }
    },
    { $unwind: "$sellerInfo" },
    {
      $match: {
        "sellerInfo.role": "SELLER"
      }
    },
    {
      $lookup: {
        from: "resources",
        localField: "resourceId",
        foreignField: "_id",
        as: "resourceInfo"
      }
    },
    { $unwind: "$resourceInfo" },
    {
      $project: {
        sellerId: 1,
        sellerName: "$sellerInfo.name",
        productId: "$resourceInfo.productId",
        revenueFromSeller: 1
      }
    },
    { $sort: { createdAt: -1 } }
  ];

  // Count pipeline
  const countPipeline = [...basePipeline, { $count: "total" }];
  const countResult = await Order.aggregate(countPipeline);
  const totalItems = countResult[0]?.total || 0;

  const skip = (page - 1) * limit;

  // Final paginated pipeline
  const paginatedPipeline = [
    ...basePipeline,
    { $skip: skip },
    { $limit: limit }
  ];

  const data = await Order.aggregate(paginatedPipeline);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
};


