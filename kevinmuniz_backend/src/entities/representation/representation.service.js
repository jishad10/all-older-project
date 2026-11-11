import mongoose from "mongoose";
import Representation from "./representation.model.js";
import Campaign from "../campaign/campaign.model.js";
import { createPaginationInfo } from "../../lib/pagination.js";
import {
  notifyRepresentationSubmitted,
  notifyRepresentationApproved,
  notifyRepresentationRejected,
} from "../notification/notification.events.js";


// Create — one user one application per campaign
export const createRepresentationService = async ({
  campaignId,
  userId,
  firstName,
  lastName,
  productionCompany,
  imdbPageLink,
  cv,
}) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID.");
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found.");

  if (campaign.approvalStatus !== "accepted" || campaign.activeStatus === "active") {
    throw new Error("Campaign is not available for representation.");
  }

  const existing = await Representation.findOne({ campaignId, userId });
  if (existing) throw new Error("You have already applied to represent this campaign.");

  const representation = await Representation.create({
    campaignId,
    userId,
    firstName,
    lastName,
    productionCompany,
    imdbPageLink,
    cv,
  });

  // Notify campaign creator: new representation application submitted
  await notifyRepresentationSubmitted({
    creatorId: campaign.createdBy,
    campaignId: campaign._id,
    representationId: representation._id,
    campaignTitle: campaign.title,
    applicantName: `${firstName} ${lastName}`,
  });

  return representation;
};


// Get ALL representations across all campaigns (admin)
export const getAllRepresentationsService = async ({ page = 1, limit = 10, status, search }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { productionCompany: { $regex: search, $options: "i" } },
    ];
  }

  const [representations, totalData] = await Promise.all([
    Representation.find(filter)
      .populate("userId", "firstName lastName email profileImage")
      .populate("campaignId", "title shortDescription image location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Representation.countDocuments(filter),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);

  return { representations, pagination };
};


// Get all representations for a specific campaign (admin)
export const getAllRepresentationsByCampaignService = async ({
  campaignId,
  page = 1,
  limit = 10,
  status,
  search,
}) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID.");
  }

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { campaignId };

  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { productionCompany: { $regex: search, $options: "i" } },
    ];
  }

  const [representations, totalData] = await Promise.all([
    Representation.find(filter)
      .populate("userId", "firstName lastName email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Representation.countDocuments(filter),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);

  return { representations, pagination };
};


// Get single representation by ID (admin)
export const getRepresentationByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid representation ID.");
  }

  const representation = await Representation.findById(id)
    .populate("userId", "firstName lastName email profileImage")
    .populate("campaignId", "title shortDescription image location");

  if (!representation) throw new Error("Representation not found.");

  return representation;
};


// Get my representation for a campaign (logged-in user)
export const getMyRepresentationService = async ({ campaignId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID.");
  }

  const representation = await Representation.findOne({ campaignId, userId })
    .populate("campaignId", "title shortDescription image location");

  if (!representation) throw new Error("Representation not found.");

  return representation;
};


// Update — admin only (includes status change)
export const updateRepresentationService = async ({
  id,
  status,
  firstName,
  lastName,
  productionCompany,
  imdbPageLink,
  cv,
}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid representation ID.");
  }

  const representation = await Representation.findById(id).populate(
    "campaignId",
    "title"
  );
  if (!representation) throw new Error("Representation not found.");

  const previousStatus = representation.status;

  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (productionCompany !== undefined) updateData.productionCompany = productionCompany;
  if (imdbPageLink !== undefined) updateData.imdbPageLink = imdbPageLink;
  if (cv !== undefined) updateData.cv = cv;
  if (status !== undefined) updateData.status = status;

  const updated = await Representation.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  const campaignTitle = representation.campaignId?.title || "a campaign";

  // Notify applicant only when status actually changes
  if (status && status !== previousStatus) {
    if (status === "approved") {
      await notifyRepresentationApproved({
        applicantId: representation.userId,
        campaignId: representation.campaignId._id,
        representationId: representation._id,
        campaignTitle,
      });
    } else if (status === "rejected") {
      await notifyRepresentationRejected({
        applicantId: representation.userId,
        campaignId: representation.campaignId._id,
        representationId: representation._id,
        campaignTitle,
      });
    }
  }

  return updated;
};


// Delete (own or admin)
export const deleteRepresentationService = async ({ id, userId, userRole }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid representation ID.");
  }

  const representation = await Representation.findById(id);
  if (!representation) throw new Error("Representation not found.");

  if (
    userRole !== "ADMIN" &&
    representation.userId.toString() !== userId.toString()
  ) {
    throw new Error("Unauthorized to delete this representation.");
  }

  await Representation.findByIdAndDelete(id);
  return true;
};




// import mongoose from "mongoose";
// import Representation from "./representation.model.js";
// import Campaign from "../campaign/campaign.model.js";
// import { createPaginationInfo } from "../../lib/pagination.js";


// // Create — one user one application per campaign
// export const createRepresentationService = async ({
//   campaignId,
//   userId,
//   firstName,
//   lastName,
//   productionCompany,
//   imdbPageLink,
//   cv,
// }) => {
//   if (!mongoose.Types.ObjectId.isValid(campaignId)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   const campaign = await Campaign.findById(campaignId);
//   if (!campaign) throw new Error("Campaign not found.");

//   if (campaign.approvalStatus !== "accepted" || campaign.activeStatus !== "active") {
//     throw new Error("Campaign is not available for representation.");
//   }

//   const existing = await Representation.findOne({ campaignId, userId });
//   if (existing) throw new Error("You have already applied to represent this campaign.");

//   const representation = await Representation.create({
//     campaignId,
//     userId,
//     firstName,
//     lastName,
//     productionCompany,
//     imdbPageLink,
//     cv,
//   });

//   return representation;
// };


// // Get ALL representations across all campaigns (admin)
// export const getAllRepresentationsService = async ({ page = 1, limit = 10, status, search }) => {
//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const filter = {};

//   if (status) filter.status = status;

//   if (search) {
//     filter.$or = [
//       { firstName: { $regex: search, $options: "i" } },
//       { lastName: { $regex: search, $options: "i" } },
//       { productionCompany: { $regex: search, $options: "i" } },
//     ];
//   }

//   const [representations, totalData] = await Promise.all([
//     Representation.find(filter)
//       .populate("userId", "firstName lastName email profileImage")
//       .populate("campaignId", "title shortDescription image location")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),

//     Representation.countDocuments(filter),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { representations, pagination };
// };


// // Get all representations for a specific campaign (admin)
// export const getAllRepresentationsByCampaignService = async ({
//   campaignId,
//   page = 1,
//   limit = 10,
//   status,
//   search,
// }) => {
//   if (!mongoose.Types.ObjectId.isValid(campaignId)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const filter = { campaignId };

//   if (status) filter.status = status;

//   if (search) {
//     filter.$or = [
//       { firstName: { $regex: search, $options: "i" } },
//       { lastName: { $regex: search, $options: "i" } },
//       { productionCompany: { $regex: search, $options: "i" } },
//     ];
//   }

//   const [representations, totalData] = await Promise.all([
//     Representation.find(filter)
//       .populate("userId", "firstName lastName email profileImage")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),

//     Representation.countDocuments(filter),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { representations, pagination };
// };


// // Get single representation by ID (admin)
// export const getRepresentationByIdService = async (id) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid representation ID.");
//   }

//   const representation = await Representation.findById(id)
//     .populate("userId", "firstName lastName email profileImage")
//     .populate("campaignId", "title shortDescription image location");

//   if (!representation) throw new Error("Representation not found.");

//   return representation;
// };


// // Get my representation for a campaign (logged-in user)
// export const getMyRepresentationService = async ({ campaignId, userId }) => {
//   if (!mongoose.Types.ObjectId.isValid(campaignId)) {
//     throw new Error("Invalid campaign ID.");
//   }

//   const representation = await Representation.findOne({ campaignId, userId })
//     .populate("campaignId", "title shortDescription image location");

//   if (!representation) throw new Error("Representation not found.");

//   return representation;
// };


// // Update — admin only (includes status change)
// export const updateRepresentationService = async ({
//   id,
//   status,
//   firstName,
//   lastName,
//   productionCompany,
//   imdbPageLink,
//   cv,
// }) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid representation ID.");
//   }

//   const representation = await Representation.findById(id);
//   if (!representation) throw new Error("Representation not found.");

//   const updateData = {};
//   if (firstName !== undefined) updateData.firstName = firstName;
//   if (lastName !== undefined) updateData.lastName = lastName;
//   if (productionCompany !== undefined) updateData.productionCompany = productionCompany;
//   if (imdbPageLink !== undefined) updateData.imdbPageLink = imdbPageLink;
//   if (cv !== undefined) updateData.cv = cv;
//   if (status !== undefined) updateData.status = status;

//   return await Representation.findByIdAndUpdate(id, updateData, {
//     new: true,
//     runValidators: true,
//   });
// };


// // Delete (own or admin)
// export const deleteRepresentationService = async ({ id, userId, userRole }) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new Error("Invalid representation ID.");
//   }

//   const representation = await Representation.findById(id);
//   if (!representation) throw new Error("Representation not found.");

//   if (
//     userRole !== "ADMIN" &&
//     representation.userId.toString() !== userId.toString()
//   ) {
//     throw new Error("Unauthorized to delete this representation.");
//   }

//   await Representation.findByIdAndDelete(id);
//   return true;
// };
