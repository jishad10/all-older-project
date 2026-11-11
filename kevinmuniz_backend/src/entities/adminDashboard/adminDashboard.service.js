import { createPaginationInfo } from "../../lib/pagination.js";
import User from "../auth/auth.model.js";
import Campaign from "../campaign/campaign.model.js";
import Donation from "../Donation/donation.model.js";

// ── OVERVIEW + TOP BACKERS + TOP CAMPAIGNS ───────────────────────────────────
export const getDashboardOverviewService = async () => {
  const [
    totalUsers,
    totalCampaigns,
    totalDonationsCount,
    totalRaisedResult,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ["USER", "CREATOR"] } }),
    Campaign.countDocuments(),
    Donation.countDocuments({ paymentStatus: "paid" }),
    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalRaisedAmount = totalRaisedResult[0]?.total || 0;

  const topBackers = await Donation.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: "$donorId",
        totalDonated: { $sum: "$amount" },
      },
    },
    { $sort: { totalDonated: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "donor",
      },
    },
    { $unwind: "$donor" },
    {
      $project: {
        _id: 0,
        donorId: "$_id",
        totalDonated: 1,
        firstName: "$donor.firstName",
        lastName: "$donor.lastName",
        email: "$donor.email",
        profileImage: "$donor.profileImage",
      },
    },
  ]);

  const topCampaigns = await Donation.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: "$campaignId",
        totalRaised: { $sum: "$amount" },
      },
    },
    { $sort: { totalRaised: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: "campaigns",
        localField: "_id",
        foreignField: "_id",
        as: "campaign",
      },
    },
    { $unwind: "$campaign" },
    {
      $lookup: {
        from: "categories",
        localField: "campaign.category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $project: {
        _id: 0,
        campaignId: "$_id",
        totalRaised: 1,
        title: "$campaign.title",
        shortDescription: "$campaign.shortDescription",
        image: "$campaign.image",
        location: "$campaign.location",
        activeStatus: "$campaign.activeStatus",
        approvalStatus: "$campaign.approvalStatus",
        category: { $arrayElemAt: ["$category.name", 0] },
      },
    },
  ]);

  return {
    stats: {
      totalUsers,
      totalCampaigns,
      totalRaisedAmount,
      totalDonations: totalDonationsCount,
    },
    topBackers,
    topCampaigns,
  };
};

// ── DONATION REPORT GRAPH ────────────────────────────────────────────────────
export const getDonationReportService = async ({ year }) => {
  const selectedYear = parseInt(year) || new Date().getFullYear();

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const result = await Donation.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31T23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const monthlyData = {};
  months.forEach((month) => {
    monthlyData[month] = 0;
  });

  result.forEach((item) => {
    const monthName = months[item._id - 1];
    monthlyData[monthName] = item.total;
  });

  return {
    year: selectedYear,
    report: monthlyData,
  };
};

// ── USERS BY ROLE WITH CAMPAIGNS ─────────────────────────────────────────────
export const getUsersByRoleWithCampaignsService = async ({
  page = 1,
  limit = 10,
  search,
  role,
}) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const allowedRoles = ["USER", "CREATOR"];
  const filter = {};

  if (role) {
    if (!allowedRoles.includes(role)) {
      throw new Error("Invalid role. Allowed values are USER or CREATOR");
    }
    filter.role = role;
  } else {
    filter.role = { $in: allowedRoles };
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, totalData] = await Promise.all([
    User.find(filter)
      .select("-password -__v -refreshToken -otp -otpExpires -otpVerified -resetExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const enrichedUsers = await Promise.all(
    users.map(async (user) => {
      let campaigns = [];

      if (user.role === "CREATOR") {
        const creatorCampaigns = await Campaign.find({ createdBy: user._id })
          .populate("category", "name")
          .lean();

        campaigns = await Promise.all(
          creatorCampaigns.map(async (campaign) => {
            const raisedResult = await Donation.aggregate([
              {
                $match: {
                  campaignId: campaign._id,
                  paymentStatus: "paid",
                },
              },
              {
                $group: {
                  _id: null,
                  totalRaised: { $sum: "$amount" },
                },
              },
            ]);

            return {
              ...campaign,
              totalRaised: raisedResult[0]?.totalRaised || 0,
            };
          })
        );
      } else {
        const donatedCampaignIds = await Donation.distinct("campaignId", {
          donorId: user._id,
          paymentStatus: "paid",
        });

        const donatedCampaigns = await Campaign.find({
          _id: { $in: donatedCampaignIds },
        })
          .populate("category", "name")
          .lean();

        campaigns = await Promise.all(
          donatedCampaigns.map(async (campaign) => {
            const [raisedResult, userDonationResult] = await Promise.all([
              Donation.aggregate([
                {
                  $match: {
                    campaignId: campaign._id,
                    paymentStatus: "paid",
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalRaised: { $sum: "$amount" },
                  },
                },
              ]),
              Donation.aggregate([
                {
                  $match: {
                    campaignId: campaign._id,
                    donorId: user._id,
                    paymentStatus: "paid",
                  },
                },
                {
                  $group: {
                    _id: null,
                    userTotalDonated: { $sum: "$amount" },
                  },
                },
              ]),
            ]);

            return {
              ...campaign,
              totalRaised: raisedResult[0]?.totalRaised || 0,
              userTotalDonated: userDonationResult[0]?.userTotalDonated || 0,
            };
          })
        );
      }

      return { ...user, campaigns };
    })
  );

  const { createPaginationInfo } = await import("../../lib/pagination.js");
  const pagination = createPaginationInfo(page, limit, totalData);

  return { users: enrichedUsers, pagination };
};



// Campaign-wise total raised
export const getCampaignWiseRaisedService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const [campaigns, totalCount] = await Promise.all([
    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: "$campaignId",
          totalRaised: { $sum: "$amount" },
          totalDonations: { $sum: 1 },
          lastDonationAt: { $max: "$createdAt" },
        },
      },
      { $sort: { totalRaised: -1 } },
      {
        $lookup: {
          from: "campaigns",
          localField: "_id",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: "$campaign" },
      // Only show accepted campaigns
      { $match: { "campaign.approvalStatus": "accepted" } },
      {
        $lookup: {
          from: "categories",
          localField: "campaign.category",
          foreignField: "_id",
          as: "campaign.category",
        },
      },
      {
        $unwind: {
          path: "$campaign.category",
           preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          campaignId: "$_id",
          totalRaised: 1,
          totalDonations: 1,
          lastDonationAt: 1,
          title: "$campaign.title",
          image: "$campaign.image",
          proposedFunding: "$campaign.proposedFunding",
          location: "$campaign.location",
          approvalStatus: "$campaign.approvalStatus",
          activeStatus: "$campaign.activeStatus",
          category: "$campaign.category.name",
          endDate: "$campaign.endDate",
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]),

    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: "$campaignId" } },
      {
        $lookup: {
          from: "campaigns",
          localField: "_id",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: "$campaign" },
      { $match: { "campaign.approvalStatus": "accepted" } },
      { $count: "total" },
    ]),
  ]);

  const pagination = createPaginationInfo(page, limit, totalCount[0]?.total || 0);

  return { campaigns, pagination };
};

// User-wise total raised
export const getUserWiseRaisedService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const [users, totalCount] = await Promise.all([
    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: "$donorId",
          totalRaised: { $sum: "$amount" },
          totalDonations: { $sum: 1 },
          uniqueCampaigns: { $addToSet: "$campaignId" },
          lastDonationAt: { $max: "$createdAt" },
        },
      },
      { $sort: { totalRaised: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "donor",
        },
      },
      { $unwind: "$donor" },
      {
        $project: {
          _id: 0,
          donorId: "$_id",
          totalRaised: 1,
          totalDonations: 1,
          totalCampaignsSupported: { $size: "$uniqueCampaigns" },
          lastDonationAt: 1,
          firstName: "$donor.firstName",
          lastName: "$donor.lastName",
          email: "$donor.email",
          profileImage: "$donor.profileImage",
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]),

    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: "$donorId" } },
      { $count: "total" },
    ]),
  ]);

  const pagination = createPaginationInfo(page, limit, totalCount[0]?.total || 0);

  return { users, pagination };
};


export const toggleUserSuspensionService = async (id) => {
  const user = await User.findById(id).select('_id firstName lastName email role isSuspended');

  if (!user) throw new Error('User not found');

  user.isSuspended = !user.isSuspended;
  await user.save({ validateBeforeSave: false });

  return user;
};