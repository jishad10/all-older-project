import Campaign from "./campaign.model.js";
import mongoose from "mongoose";
import Donation from "../Donation/donation.model.js";
import {
  notifyCampaignApproved,
} from "../notification/notification.events.js";
import { createPaginationInfo } from "../../lib/pagination.js";


export const createCampaignService = async (data) => {
  const {
    title,
    shortDescription,
    category,
    location,
    proposedFunding,
    creatingDate,
    endDate,
    campaignDetails,
    image,
    createdBy
  } = data;

  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw new Error("Invalid category.");
  }

  if (new Date(endDate) <= new Date(creatingDate)) {
    throw new Error("End date must be after creating date.");
  }

  const campaign = new Campaign({
    title,
    shortDescription,
    category,
    location,
    proposedFunding,
    creatingDate,
    endDate,
    campaignDetails,
    image,
    createdBy
  });

  return await campaign.save();
};


export const getAllCampaignsService = async ({
  page,
  limit,
  approvalStatus,
  activeStatus,
  search,
  user
}) => {
  const skip = (page - 1) * limit;

  let filter = {};

  // Role based filtering
  if (user?.role === "ADMIN") {
    // Admin sees everything
  } else if (user?.role === "CREATOR") {
    filter.createdBy = user._id;
  } else {
    filter.approvalStatus = "accepted";
  }

  if (approvalStatus && (user?.role === "ADMIN" || user?.role === "CREATOR")) {
    filter.approvalStatus = approvalStatus;
  }

  if (activeStatus) {
    filter.activeStatus = activeStatus;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { shortDescription: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } }
    ];
  }

  const [campaigns, totalData] = await Promise.all([
    Campaign.find(filter)
      .populate("category", "name")
      .populate("createdBy", "firstName lastName email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Campaign.countDocuments(filter)
  ]);

  // Attach totalRaised + totalDonations to each campaign
  const enrichedCampaigns = await Promise.all(
    campaigns.map(async (campaign) => {
      const [raisedResult, totalDonations] = await Promise.all([
        Donation.aggregate([
          { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
          { $group: { _id: null, totalRaised: { $sum: "$amount" } } },
        ]),
        Donation.countDocuments({ campaignId: campaign._id, paymentStatus: "paid" }),
      ]);

      return {
        ...campaign.toObject(),
        totalRaised: raisedResult[0]?.totalRaised || 0,
        totalDonations,
      };
    })
  );

  return { campaigns: enrichedCampaigns, totalData };
};


export const updateCampaignStatusService = async (id, updates) => {

  const { approvalStatus, activeStatus } = updates;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const previousApprovalStatus = campaign.approvalStatus;

  // Handle Approval Status
  if (approvalStatus) {

    if (!["pending", "accepted", "rejected"].includes(approvalStatus)) {
      throw new Error("Invalid approval status.");
    }

    campaign.approvalStatus = approvalStatus;

    // If rejected → automatically inactive
    if (approvalStatus === "rejected") {
      campaign.activeStatus = "inactive";
    }
  }

  // Handle Active Status
  if (activeStatus) {

    if (!["active", "inactive"].includes(activeStatus)) {
      throw new Error("Invalid active status.");
    }

    if (campaign.approvalStatus !== "accepted" && activeStatus === "active") {
      throw new Error("Only accepted campaigns can be activated.");
    }

    campaign.activeStatus = activeStatus;
  }

  const saved = await campaign.save();

  // Notify creator when campaign is approved (only on status change to "accepted")
  if (approvalStatus === "accepted" && previousApprovalStatus !== "accepted") {
    await notifyCampaignApproved({
      creatorId: campaign.createdBy,
      campaignId: campaign._id,
      campaignTitle: campaign.title,
    });
  }

  return saved;
};


export const updateCampaignService = async (id, updates, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid campaign ID.");
  }

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const isAdmin = user?.role === "ADMIN";
  const isOwner = user && campaign.createdBy.toString() === user._id.toString();

  if (!isAdmin && !isOwner) {
    throw new Error("Unauthorized to update this campaign.");
  }

  const allowedFields = [
    "title",
    "shortDescription",
    "category",
    "location",
    "proposedFunding",
    "creatingDate",
    "endDate",
    "campaignDetails",
    "image"
  ];

  // Validate category if provided
  if (updates.category && !mongoose.Types.ObjectId.isValid(updates.category)) {
    throw new Error("Invalid category.");
  }

  // Validate dates if provided (or when both are known)
  const nextCreatingDate = updates.creatingDate
    ? new Date(updates.creatingDate)
    : campaign.creatingDate;
  const nextEndDate = updates.endDate
    ? new Date(updates.endDate)
    : campaign.endDate;

  if (nextEndDate <= nextCreatingDate) {
    throw new Error("End date must be after creating date.");
  }

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined && updates[field] !== null) {
      campaign[field] = updates[field];
    }
  });

  return await campaign.save();
};


export const getCampaignByIdService = async ({ id, user, page = 1, limit = 10 }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid campaign ID.");
  }

  const campaign = await Campaign.findById(id)
    .populate("category", "name")
    .populate("createdBy", "firstName lastName email profileImage");

  if (!campaign) throw new Error("Campaign not found.");

  const isOwner =
    user?.role === "CREATOR" &&
    campaign.createdBy?._id?.toString() === user?._id?.toString();

  if (user?.role !== "ADMIN" && !isOwner && campaign.approvalStatus !== "accepted") {
    throw new Error("Campaign not found.");
  }

  const skip = (page - 1) * limit;

  const [raisedResult, totalDonations, donors, totalDonors] = await Promise.all([
    Donation.aggregate([
      { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
      { $group: { _id: null, totalRaised: { $sum: "$amount" } } },
    ]),
    Donation.countDocuments({ campaignId: campaign._id, paymentStatus: "paid" }),
    Donation.aggregate([
      { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
      {
        $group: {
          _id: "$donorId",
          totalDonated: { $sum: "$amount" },
          donationCount: { $sum: 1 },
          lastDonatedAt: { $max: "$createdAt" },
        },
      },
      { $sort: { totalDonated: -1 } },
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
          donationCount: 1,
          lastDonatedAt: 1,
          firstName: "$donor.firstName",
          lastName: "$donor.lastName",
          email: "$donor.email",
          profileImage: "$donor.profileImage",
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]),
    // Count distinct donors for pagination
    Donation.aggregate([
      { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
      { $group: { _id: "$donorId" } },
      { $count: "total" },
    ]),
  ]);

  const donorPagination = createPaginationInfo(page, limit, totalDonors[0]?.total || 0);

  return {
    campaign: campaign.toObject(),
    totalRaised: raisedResult[0]?.totalRaised || 0,
    totalDonations,
    donors,
    donorPagination,
  };
};


export const closeCampaignService = async (id, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid campaign ID.");
  }

  const campaign = await Campaign.findById(id);
  if (!campaign) throw new Error("Campaign not found.");

  // Only admin or the creator can close
  if (
    userRole !== "ADMIN" &&
    campaign.createdBy.toString() !== userId.toString()
  ) {
    throw new Error("Unauthorized to close this campaign.");
  }

  if (campaign.closedStatus === "closed") {
    throw new Error("Campaign is already closed.");
  }

  campaign.closedStatus = "closed";
  await campaign.save();

  return campaign;
};



export const deleteCampaignService = async (id, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid campaign ID.");
  }

  const campaign = await Campaign.findById(id);
  if (!campaign) throw new Error("Campaign not found.");

  // Only admin or the creator who owns it can delete
  if (
    userRole !== "ADMIN" &&
    campaign.createdBy.toString() !== userId.toString()
  ) {
    throw new Error("Unauthorized to delete this campaign.");
  }

  await Campaign.findByIdAndDelete(id);
  return true;
};







// import Campaign from "./campaign.model.js";
// import mongoose from "mongoose";
// import Donation from "../Donation/donation.model.js";

// export const createCampaignService = async (data) => {

//   const {
//     title,
//     shortDescription,
//     category,
//     location,
//     proposedFunding,
//     creatingDate,
//     endDate,
//     campaignDetails,
//     image,
//     createdBy
//   } = data;

//   if (!mongoose.Types.ObjectId.isValid(category)) {
//     throw new Error("Invalid category.");
//   }

//   if (new Date(endDate) <= new Date(creatingDate)) {
//     throw new Error("End date must be after creating date.");
//   }

//   const campaign = new Campaign({
//     title,
//     shortDescription,
//     category,
//     location,
//     proposedFunding,
//     creatingDate,
//     endDate,
//     campaignDetails,
//     image,
//     createdBy
//   });

//   return await campaign.save();
// };


// export const getAllCampaignsService = async ({
//   page,
//   limit,
//   approvalStatus,
//   activeStatus,
//   search,
//   user
// }) => {
//   const skip = (page - 1) * limit;

//   let filter = {};

//   // Role based filtering
//   if (user?.role === "ADMIN") {
//     // Admin sees everything
//   } else {
//     filter.approvalStatus = "accepted";
//   }

//   if (approvalStatus && user?.role === "ADMIN") {
//     filter.approvalStatus = approvalStatus;
//   }

//   if (activeStatus) {
//     filter.activeStatus = activeStatus;
//   }

//   if (search) {
//     filter.$or = [
//       { title: { $regex: search, $options: "i" } },
//       { shortDescription: { $regex: search, $options: "i" } },
//       { location: { $regex: search, $options: "i" } }
//     ];
//   }

//   const [campaigns, totalData] = await Promise.all([
//     Campaign.find(filter)
//       .populate("category", "name")
//       .populate("createdBy", "firstName lastName email profileImage")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),
//     Campaign.countDocuments(filter)
//   ]);

//   // Attach totalRaised + totalDonations to each campaign
//   const enrichedCampaigns = await Promise.all(
//     campaigns.map(async (campaign) => {
//       const [raisedResult, totalDonations] = await Promise.all([
//         Donation.aggregate([
//           { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
//           { $group: { _id: null, totalRaised: { $sum: "$amount" } } },
//         ]),
//         Donation.countDocuments({ campaignId: campaign._id, paymentStatus: "paid" }),
//       ]);

//       return {
//         ...campaign.toObject(),
//         totalRaised: raisedResult[0]?.totalRaised || 0,
//         totalDonations,
//       };
//     })
//   );

//   return { campaigns: enrichedCampaigns, totalData };
// };



// export const updateCampaignStatusService = async (id, updates) => {

//   const { approvalStatus, activeStatus } = updates;

//   const campaign = await Campaign.findById(id);

//   if (!campaign) {
//     throw new Error("Campaign not found.");
//   }

//   // 🔹 Handle Approval Status
//   if (approvalStatus) {

//     if (!["pending", "accepted", "rejected"].includes(approvalStatus)) {
//       throw new Error("Invalid approval status.");
//     }

//     campaign.approvalStatus = approvalStatus;

//     // If rejected → automatically inactive
//     if (approvalStatus === "rejected") {
//       campaign.activeStatus = "inactive";
//     }
//   }

//   // 🔹 Handle Active Status
//   if (activeStatus) {

//     if (!["active", "inactive"].includes(activeStatus)) {
//       throw new Error("Invalid active status.");
//     }

//     if (campaign.approvalStatus !== "accepted" && activeStatus === "active") {
//       throw new Error("Only accepted campaigns can be activated.");
//     }

//     campaign.activeStatus = activeStatus;
//   }

//   return await campaign.save();
// };


// export const updateCampaignService = async (id, updates, user) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   const campaign = await Campaign.findById(id);
//   if (!campaign) {
//     throw new Error("Campaign not found.");
//   }

//   const isAdmin = user?.role === "ADMIN";
//   const isOwner = user && campaign.createdBy.toString() === user._id.toString();

//   if (!isAdmin && !isOwner) {
//     throw new Error("Unauthorized to update this campaign.");
//   }

//   const allowedFields = [
//     "title",
//     "shortDescription",
//     "category",
//     "location",
//     "creatingDate",
//     "endDate",
//     "campaignDetails",
//     "image"
//   ];

//   // Validate category if provided
//   if (updates.category && !mongoose.Types.ObjectId.isValid(updates.category)) {
//     throw new Error("Invalid category.");
//   }

//   // Validate dates if provided (or when both are known)
//   const nextCreatingDate = updates.creatingDate
//     ? new Date(updates.creatingDate)
//     : campaign.creatingDate;
//   const nextEndDate = updates.endDate
//     ? new Date(updates.endDate)
//     : campaign.endDate;

//   if (nextEndDate <= nextCreatingDate) {
//     throw new Error("End date must be after creating date.");
//   }

//   allowedFields.forEach((field) => {
//     if (updates[field] !== undefined && updates[field] !== null) {
//       campaign[field] = updates[field];
//     }
//   });

//   return await campaign.save();
// };

// export const getCampaignByIdService = async ({ id, user }) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   const campaign = await Campaign.findById(id)
//     .populate("category", "name")
//     .populate("createdBy", "firstName lastName email profileImage");

//   if (!campaign) throw new Error("Campaign not found.");

//   // Non-admin can only see accepted campaigns
//   if (user?.role !== "ADMIN" && campaign.approvalStatus !== "accepted") {
//     throw new Error("Campaign not found.");
//   }

//   // Total raised + total donations
//   const [raisedResult, totalDonations] = await Promise.all([
//     Donation.aggregate([
//       { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
//       { $group: { _id: null, totalRaised: { $sum: "$amount" } } },
//     ]),
//     Donation.countDocuments({ campaignId: campaign._id, paymentStatus: "paid" }),
//   ]);

//   // Donors list with their individual donation amount to this campaign
//   const donors = await Donation.aggregate([
//     { $match: { campaignId: campaign._id, paymentStatus: "paid" } },
//     {
//       $group: {
//         _id: "$donorId",
//         totalDonated: { $sum: "$amount" },
//         donationCount: { $sum: 1 },
//         lastDonatedAt: { $max: "$createdAt" },
//       },
//     },
//     { $sort: { totalDonated: -1 } },
//     {
//       $lookup: {
//         from: "users",
//         localField: "_id",
//         foreignField: "_id",
//         as: "donor",
//       },
//     },
//     { $unwind: "$donor" },
//     {
//       $project: {
//         _id: 0,
//         donorId: "$_id",
//         totalDonated: 1,
//         donationCount: 1,
//         lastDonatedAt: 1,
//         firstName: "$donor.firstName",
//         lastName: "$donor.lastName",
//         email: "$donor.email",
//         profileImage: "$donor.profileImage",
//       },
//     },
//   ]);

//   return {
//     campaign: campaign.toObject(),
//     totalRaised: raisedResult[0]?.totalRaised || 0,
//     totalDonations,
//     donors,
//   };
// };



// export const deleteCampaignService = async (id, userId, userRole) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   const campaign = await Campaign.findById(id);
//   if (!campaign) throw new Error("Campaign not found.");

//   // Only admin or the creator who owns it can delete
//   if (
//     userRole !== "ADMIN" &&
//     campaign.createdBy.toString() !== userId.toString()
//   ) {
//     throw new Error("Unauthorized to delete this campaign.");
//   }

//   await Campaign.findByIdAndDelete(id);
//   return true;
// };
