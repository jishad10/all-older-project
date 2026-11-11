import driverWorkSessionModel from "./driverWorkSession.model.js";
import User from "../auth/auth.model.js";
import RoleType from "../../lib/types.js";

export const punchInService = async (driverId) => {
  const existingSession = await driverWorkSessionModel.findOne({
    driver: driverId,
    status: "IN_PROGRESS"
  });

  if (existingSession) {
    throw new Error("You are already punched in");
  }

  return await driverWorkSessionModel.create({
    driver: driverId,
    punchInAt: new Date()
  });
};

export const punchOutService = async (driverId) => {
  const session = await driverWorkSessionModel.findOne({
    driver: driverId,
    status: "IN_PROGRESS"
  });

  if (!session) {
    throw new Error("No active work session found");
  }

  const punchOutAt = new Date();
  const totalMinutes = Math.floor(
    (punchOutAt - session.punchInAt) / 60000
  );

  session.punchOutAt = punchOutAt;
  session.totalMinutes = totalMinutes;
  session.status = "COMPLETED";

  await session.save();
  return session;
};

// NEW: Get all drivers' working hours with filters
export const getDriverWorkingHours = async ({
  page = 1,
  limit = 10,
  search = "",
  startDate = null,
  endDate = null
}) => {
  const skip = (page - 1) * limit;

  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.punchInAt = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  } else if (startDate) {
    dateFilter.punchInAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    dateFilter.punchInAt = {
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  }

  // Build user search filter
  let userFilter = { role: RoleType.DRIVER };
  if (search) {
    userFilter.$or = [
      { email: { $regex: search, $options: "i" } },
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } }
    ];
  }

  // Get matching drivers
  const drivers = await User.find(userFilter).select("_id");
  const driverIds = drivers.map((d) => d._id);

  // Aggregate sessions by driver and date
  const pipeline = [
    {
      $match: {
        driver: { $in: driverIds },
        status: "COMPLETED", // Only count completed sessions
        ...dateFilter
      }
    },
    {
      $addFields: {
        dateOnly: {
          $dateToString: { format: "%Y-%m-%d", date: "$punchInAt" }
        }
      }
    },
    {
      $group: {
        _id: {
          driver: "$driver",
          date: "$dateOnly"
        },
        totalMinutes: { $sum: "$totalMinutes" },
        sessions: {
          $push: {
            punchInAt: "$punchInAt",
            punchOutAt: "$punchOutAt",
            totalMinutes: "$totalMinutes"
          }
        },
        firstPunchIn: { $min: "$punchInAt" },
        lastPunchOut: { $max: "$punchOutAt" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.driver",
        foreignField: "_id",
        as: "driverInfo"
      }
    },
    {
      $unwind: "$driverInfo"
    },
    {
      $project: {
        _id: 0,
        driverId: "$_id.driver",
        driverName: {
          $concat: ["$driverInfo.firstName", " ", "$driverInfo.lastName"]
        },
        email: "$driverInfo.email",
        profileImage: "$driverInfo.profileImage",
        date: "$_id.date",
        startTime: "$firstPunchIn",
        endTime: "$lastPunchOut",
        totalMinutes: 1,
        totalHours: { $divide: ["$totalMinutes", 60] },
        sessions: 1
      }
    },
    { $sort: { date: -1, driverName: 1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];

  const result = await driverWorkSessionModel.aggregate(pipeline);

  const total = result[0].metadata[0]?.total || 0;
  const data = result[0].data || [];

  // Format response
  const formattedData = data.map((item) => ({
    driverName: item.driverName,
    email: item.email,
    profileImage: item.profileImage || "",
    date: item.date,
    startTime: formatTime(item.startTime),
    endTime: formatTime(item.endTime),
    hours: `${Math.floor(item.totalHours)} hours`,
    totalMinutes: item.totalMinutes,
    sessions: item.sessions
  }));

  return {
    workingHours: formattedData,
    paginationInfo: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      recordsPerPage: parseInt(limit)
    }
  };
};

// Helper function to format time
const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};