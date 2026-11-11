import Stripe from "stripe";
import mongoose from "mongoose";
import Campaign from "../campaign/campaign.model.js";
import Donation from "./donation.model.js";
import { createPaginationInfo } from "../../lib/pagination.js";
import {
  notifyRefundSubmitted,
  notifyRefundUnderReview,
  notifyRefundProcessed,
} from "../notification/notification.events.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const createDonationSessionService = async ({ campaignId, amount, donorId }) => {
  if (!campaignId || !amount || !donorId) {
    throw new Error("Missing required fields");
  }

  if (amount <= 0) throw new Error("Invalid donation amount");

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  if (campaign.approvalStatus !== "accepted" || campaign.activeStatus !== "active") {
    throw new Error("Campaign is not available for donations");
  }

  const donation = await Donation.create({
    campaignId,
    donorId,
    amount,
    paymentStatus: "pending",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Donation for ${campaign.title}`,
            description: campaign.shortDescription || "Campaign donation",
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/dashboard/donation-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/dashboard/donation-failed`,
    metadata: {
      donationId: donation._id.toString(),
      campaignId: campaignId.toString(),
      donorId: donorId.toString(),
    },
  });

  donation.stripeSessionId = session.id;
  await donation.save();

  return { url: session.url, donationId: donation._id };
};


export const getAllDonationsService = async ({ page = 1, limit = 10 }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const [donations, totalData] = await Promise.all([
    Donation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("campaignId", "title shortDescription location image")
      .populate("donorId", "firstName lastName email profileImage"),
    Donation.countDocuments(),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);
  return { donations, pagination };
};


export const getDonationConfirmationService = async ({ sessionId, donorId }) => {
  // Find donation by stripe session ID, populated with campaign + donor
  const donation = await Donation.findOne({ stripeSessionId: sessionId })
    .populate({
      path: "campaignId",
      select: "title shortDescription thumbnail category goalAmount raisedAmount createdBy",
      populate: {
        path: "createdBy",
        select: "firstName lastName",
      },
    })
    .populate("donorId", "firstName lastName email");

  if (!donation) throw new Error("Donation not found");

  // Security: ensure the requesting user owns this donation
  if (donation.donorId._id.toString() !== donorId.toString()) {
    throw new Error("Unauthorized access to this donation");
  }

  const campaign = donation.campaignId;
  const donor = donation.donorId;

  return {
    donation: {
      id: donation._id,
      amount: donation.amount,
      paymentStatus: donation.paymentStatus,
      stripeSessionId: donation.stripeSessionId,
      stripePaymentIntentId: donation.stripePaymentIntentId,
      createdAt: donation.createdAt,
    },
    campaign: {
      id: campaign._id,
      title: campaign.title,
      shortDescription: campaign.shortDescription,
      thumbnail: campaign.thumbnail,
      category: campaign.category,
      goalAmount: campaign.goalAmount,
      raisedAmount: campaign.raisedAmount,
      creator: campaign.createdBy
        ? {
            name: `${campaign.createdBy.firstName} ${campaign.createdBy.lastName}`,
          }
        : null,
    },
    donor: {
      id: donor._id,
      name: `${donor.firstName} ${donor.lastName}`,
      email: donor.email,
    },
  };
};


export const getMyDonationsService = async ({ donorId, page = 1, limit = 10 }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const [donations, totalData] = await Promise.all([
    Donation.find({ donorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("campaignId", "title shortDescription location image"),
    Donation.countDocuments({ donorId }),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);
  return { donations, pagination };
};


export const getBackerDonationHistoryService = async ({ userId, campaignId, page = 1, limit = 10 }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { donorId: userId };
  if (campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) throw new Error("Invalid campaign ID.");
    filter.campaignId = new mongoose.Types.ObjectId(campaignId);
  }

  const [donations, totalData] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("campaignId", "title shortDescription location image"),
    Donation.countDocuments(filter),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);
  return { donations, pagination };
};


export const requestRefundService = async ({ donationId, donorId, reason }) => {
  if (!reason || !reason.trim()) {
    throw new Error("Refund reason is required");
  }

  const donation = await Donation.findById(donationId).populate("campaignId", "title");
  if (!donation) throw new Error("Donation not found");

  if (donation.donorId.toString() !== donorId.toString()) {
    throw new Error("Unauthorized: This donation does not belong to you");
  }

  if (donation.paymentStatus !== "paid") {
    throw new Error("Only completed payments can be refunded");
  }

  if (donation.refundStatus !== null) {
    throw new Error("A refund request has already been submitted for this donation");
  }

  donation.refundStatus = "pending";
  donation.refundReason = reason.trim();
  donation.refundRequestedAt = new Date();
  await donation.save();

  await notifyRefundSubmitted({
    donorId,
    campaignId: donation.campaignId._id,
    donationId: donation._id,
    campaignTitle: donation.campaignId.title,
  });

  return donation;
};


export const getAllRefundRequestsService = async ({ page = 1, limit = 10, status }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const validStatuses = ["pending", "review", "refunded"];
  const filter = { refundStatus: { $ne: null } };

  if (status) {
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    filter.refundStatus = status;
  }

  const [donations, totalData] = await Promise.all([
    Donation.find(filter)
      .sort({ refundRequestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("campaignId", "title shortDescription location image")
      .populate("donorId", "firstName lastName email profileImage"),
    Donation.countDocuments(filter),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);
  return { donations, pagination };
};


export const updateRefundStatusService = async ({ donationId, status }) => {
  const validStatuses = ["review", "refunded"];

  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const donation = await Donation.findById(donationId).populate("campaignId", "title");
  if (!donation) throw new Error("Donation not found");

  if (donation.refundStatus === null) {
    throw new Error("No refund request found for this donation");
  }

  if (donation.refundStatus === "refunded") {
    throw new Error("This donation has already been refunded");
  }

  if (status === "refunded") {
    if (!donation.stripePaymentIntentId) {
      throw new Error("No payment intent found. Cannot process refund.");
    }

    await stripe.refunds.create({
      payment_intent: donation.stripePaymentIntentId,
      amount: Math.round(donation.amount * 100),
    });

    donation.refundProcessedAt = new Date();
  }

  donation.refundStatus = status;
  await donation.save();

  const campaignTitle = donation.campaignId?.title || "your campaign";

  if (status === "review") {
    await notifyRefundUnderReview({
      donorId: donation.donorId,
      campaignId: donation.campaignId._id,
      donationId: donation._id,
      campaignTitle,
    });
  } else if (status === "refunded") {
    await notifyRefundProcessed({
      donorId: donation.donorId,
      campaignId: donation.campaignId._id,
      donationId: donation._id,
      campaignTitle,
      amount: donation.amount,
    });
  }

  return donation;
};





// import Stripe from "stripe";
// import mongoose from "mongoose";
// import Campaign from "../campaign/campaign.model.js";
// import Donation from "./donation.model.js";
// import { createPaginationInfo } from "../../lib/pagination.js";


// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// export const createDonationSessionService = async ({ campaignId, amount, donorId }) => {
//   if (!campaignId || !amount || !donorId) {
//     throw new Error("Missing required fields");
//   }

//   if (amount <= 0) throw new Error("Invalid donation amount");

//   const campaign = await Campaign.findById(campaignId);
//   if (!campaign) throw new Error("Campaign not found");

//   if (campaign.approvalStatus !== "accepted" || campaign.activeStatus !== "active") {
//     throw new Error("Campaign is not available for donations");
//   }

//   const donation = await Donation.create({
//     campaignId,
//     donorId,
//     amount,
//     paymentStatus: "pending",
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     mode: "payment",
//     line_items: [
//       {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: `Donation for ${campaign.title}`,
//             description: campaign.shortDescription || "Campaign donation",
//           },
//           unit_amount: Math.round(amount * 100),
//         },
//         quantity: 1,
//       },
//     ],
//     success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//     metadata: {
//       donationId: donation._id.toString(),
//       campaignId: campaignId.toString(),
//       donorId: donorId.toString(),
//     },
//   });

//   donation.stripeSessionId = session.id;
//   await donation.save();

//   return { url: session.url, donationId: donation._id };
// };


// export const getAllDonationsService = async ({ page = 1, limit = 10 }) => {
//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const [donations, totalData] = await Promise.all([
//     Donation.find()
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("campaignId", "title shortDescription location image")
//       .populate("donorId", "firstName lastName email profileImage"),

//     Donation.countDocuments(),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { donations, pagination };
// };


// export const getMyDonationsService = async ({ donorId, page = 1, limit = 10 }) => {
//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const [donations, totalData] = await Promise.all([
//     Donation.find({ donorId })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("campaignId", "title shortDescription location image"),

//     Donation.countDocuments({ donorId }),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { donations, pagination };
// };


// export const getBackerDonationHistoryService = async ({ userId, campaignId, page = 1, limit = 10 }) => {
//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const filter = { donorId: userId };
//   if (campaignId) {
//     if (!mongoose.Types.ObjectId.isValid(campaignId)) throw new Error("Invalid campaign ID.");
//     filter.campaignId = new mongoose.Types.ObjectId(campaignId);
//   }

//   const [donations, totalData] = await Promise.all([
//     Donation.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("campaignId", "title shortDescription location image"),
//     Donation.countDocuments(filter),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { donations, pagination };
// };


// export const requestRefundService = async ({ donationId, donorId, reason }) => {
//   if (!reason || !reason.trim()) {
//     throw new Error("Refund reason is required");
//   }

//   const donation = await Donation.findById(donationId);
//   if (!donation) throw new Error("Donation not found");

//   if (donation.donorId.toString() !== donorId.toString()) {
//     throw new Error("Unauthorized: This donation does not belong to you");
//   }

//   if (donation.paymentStatus !== "paid") {
//     throw new Error("Only completed payments can be refunded");
//   }

//   if (donation.refundStatus !== null) {
//     throw new Error("A refund request has already been submitted for this donation");
//   }

//   donation.refundStatus = "pending";
//   donation.refundReason = reason.trim();
//   donation.refundRequestedAt = new Date();
//   await donation.save();

//   return donation;
// };


// export const getAllRefundRequestsService = async ({ page = 1, limit = 10, status }) => {
//   page = Number(page) || 1;
//   limit = Number(limit) || 10;
//   const skip = (page - 1) * limit;

//   const validStatuses = ["pending", "review", "refunded"];

//   const filter = { refundStatus: { $ne: null } };

//   if (status) {
//     if (!validStatuses.includes(status)) {
//       throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
//     }
//     filter.refundStatus = status;
//   }

//   const [donations, totalData] = await Promise.all([
//     Donation.find(filter)
//       .sort({ refundRequestedAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("campaignId", "title shortDescription location image")
//       .populate("donorId", "firstName lastName email profileImage"),

//     Donation.countDocuments(filter),
//   ]);

//   const pagination = createPaginationInfo(page, limit, totalData);

//   return { donations, pagination };
// };


// export const updateRefundStatusService = async ({ donationId, status }) => {
//   const validStatuses = ["review", "refunded"];

//   if (!status || !validStatuses.includes(status)) {
//     throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
//   }

//   const donation = await Donation.findById(donationId);
//   if (!donation) throw new Error("Donation not found");

//   if (donation.refundStatus === null) {
//     throw new Error("No refund request found for this donation");
//   }

//   if (donation.refundStatus === "refunded") {
//     throw new Error("This donation has already been refunded");
//   }

//   if (status === "refunded") {
//     if (!donation.stripePaymentIntentId) {
//       throw new Error("No payment intent found. Cannot process refund.");
//     }

//     // Issue the refund via Stripe
//     await stripe.refunds.create({
//       payment_intent: donation.stripePaymentIntentId,
//       amount: Math.round(donation.amount * 100), // full refund 
//     });

//     donation.refundProcessedAt = new Date();
//   }

//   donation.refundStatus = status;
//   await donation.save();

//   return donation;
// };
