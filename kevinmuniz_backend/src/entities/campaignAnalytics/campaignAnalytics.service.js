import mongoose from "mongoose";
import Campaign from "../campaign/campaign.model.js";
import Donation from "../Donation/donation.model.js";
import Category from "../category/category.model.js";
import { createPaginationInfo } from "../../lib/pagination.js";


// ── CAMPAIGN DASHBOARD ───────────────────────────────────────────────────────
export const getCampaignDashboardService = async ({ year }) => {
  const selectedYear = parseInt(year) || new Date().getFullYear();

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const yearStart = new Date(`${selectedYear}-01-01`);
  const yearEnd   = new Date(`${selectedYear}-12-31T23:59:59`);

  const yearFilter = {
    paymentStatus: "paid",
    createdAt: { $gte: yearStart, $lte: yearEnd },
  };


  // 1. Stats — total raised, total donations, total unique donors, avg donation
  const [statsResult, totalDonations, totalDonors] = await Promise.all([
    Donation.aggregate([
      { $match: yearFilter },
      {
        $group: {
          _id: null,
          totalRaised: { $sum: "$amount" },
          avgDonation: { $avg: "$amount" },
        },
      },
    ]),
    Donation.countDocuments(yearFilter),
    Donation.distinct("donorId", yearFilter),
  ]);

  const stats = {
    totalRaised:    statsResult[0]?.totalRaised  || 0,
    totalDonations: totalDonations,
    totalDonors:    totalDonors.length,
    avgDonation:    Math.round(statsResult[0]?.avgDonation || 0),
  };


  // 2. Donation Trends — monthly raised for selected year
  const trendsResult = await Donation.aggregate([
    { $match: yearFilter },
    {
      $group: {
        _id: { $month: "$createdAt" },
        totalRaised: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const donationTrends = {};
  months.forEach((m) => (donationTrends[m] = 0));
  trendsResult.forEach((item) => {
    donationTrends[months[item._id - 1]] = item.totalRaised;
  });


  // 3. Donations by Category — percentage of total raised per category (year filtered)
  const categoryResult = await Donation.aggregate([
    { $match: yearFilter },
    {
      $lookup: {
        from: "campaigns",
        localField: "campaignId",
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
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category._id",
        categoryName: { $first: "$category.name" },
        totalRaised: { $sum: "$amount" },
      },
    },
    { $sort: { totalRaised: -1 } },
  ]);

  const grandTotal = categoryResult.reduce((sum, c) => sum + c.totalRaised, 0);

  const TOP_CATEGORIES = 3;
  const topCategories = categoryResult.slice(0, TOP_CATEGORIES);
  const othersTotal   = categoryResult.slice(TOP_CATEGORIES).reduce((sum, c) => sum + c.totalRaised, 0);

  const donationsByCategory = topCategories.map((c) => ({
    category:    c.categoryName,
    totalRaised: c.totalRaised,
    percentage:  grandTotal > 0 ? Math.round((c.totalRaised / grandTotal) * 100) : 0,
  }));

  if (othersTotal > 0) {
    donationsByCategory.push({
      category:    "Others",
      totalRaised: othersTotal,
      percentage:  grandTotal > 0 ? Math.round((othersTotal / grandTotal) * 100) : 0,
    });
  }


  // 4. Top 3 Performing Campaigns — by total raised (year filtered)
  const topCampaigns = await Donation.aggregate([
    { $match: yearFilter },
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
        campaignId:       "$_id",
        totalRaised:      1,
        title:            "$campaign.title",
        shortDescription: "$campaign.shortDescription",
        image:            "$campaign.image",
        location:         "$campaign.location",
        activeStatus:     "$campaign.activeStatus",
        approvalStatus:   "$campaign.approvalStatus",
        category:         { $arrayElemAt: ["$category.name", 0] },
      },
    },
  ]);


  return {
    year: selectedYear,
    stats,
    donationTrends,
    donationsByCategory,
    topCampaigns,
  };
};


// ── CREATOR DASHBOARD STATS ──────────────────────────────────────────────────
export const getCreatorDashboardStatsService = async ({ creatorId }) => {
  const campaigns = await Campaign.find({ createdBy: creatorId }).lean();
  const campaignIds = campaigns.map((c) => c._id);

  if (campaignIds.length === 0) {
    return { totalRaised: 0, activeCampaigns: 0, totalDonors: 0, avgDonation: 0 };
  }

  const [statsResult, totalDonors, activeCampaigns] = await Promise.all([
    Donation.aggregate([
      { $match: { campaignId: { $in: campaignIds }, paymentStatus: "paid" } },
      { $group: { _id: null, totalRaised: { $sum: "$amount" }, avgDonation: { $avg: "$amount" } } },
    ]),
    Donation.distinct("donorId", { campaignId: { $in: campaignIds }, paymentStatus: "paid" }),
    Campaign.countDocuments({ createdBy: creatorId, activeStatus: "active" }),
  ]);

  return {
    totalRaised:    statsResult[0]?.totalRaised || 0,
    activeCampaigns,
    totalDonors:    totalDonors.length,
    avgDonation:    Math.round(statsResult[0]?.avgDonation || 0),
  };
};


// ── CREATOR DASHBOARD OVERVIEW (MY CAMPAIGNS + RECENT DONORS) ────────────────
export const getCreatorDashboardOverviewService = async ({ creatorId }) => {
  const campaigns = await Campaign.find({ createdBy: creatorId })
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = campaigns.map((c) => c._id);

  if (campaignIds.length === 0) {
    return { myCampaigns: [], recentDonors: [] };
  }

  // My Campaigns — with totalRaised + totalDonations per campaign
  const myCampaigns = await Promise.all(
    campaigns.map(async (campaign) => {
      const [raisedResult, totalDonations] = await Promise.all([
        Donation.aggregate([
          { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
          { $group: { _id: null, totalRaised: { $sum: "$amount" } } },
        ]),
        Donation.countDocuments({ campaignId: campaign._id, paymentStatus: "paid" }),
      ]);

      return {
        ...campaign,
        totalRaised: raisedResult[0]?.totalRaised || 0,
        totalDonations,
      };
    })
  );

  // Recent Donors — latest 10 donations across all creator's campaigns
  const recentDonations = await Donation.find({
    campaignId: { $in: campaignIds },
    paymentStatus: "paid",
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("donorId", "firstName lastName email profileImage")
    .populate("campaignId", "title")
    .lean();

  const recentDonors = recentDonations.map((d) => ({
    donorId:       d.donorId?._id,
    firstName:     d.donorId?.firstName,
    lastName:      d.donorId?.lastName,
    email:         d.donorId?.email,
    profileImage:  d.donorId?.profileImage,
    campaignTitle: d.campaignId?.title,
    amount:        d.amount,
    donatedAt:     d.createdAt,
  }));

  return { myCampaigns, recentDonors };
};