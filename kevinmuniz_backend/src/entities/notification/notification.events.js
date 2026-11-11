// Notification Events
// All business-logic notification triggers live here

import { getIO } from "./socketManager.js";
import logger from "../../core/config/logger.js";
import Notification from "./notification.model.js";


export const sendNotification = async ({
  recipientId,
  type,
  title,
  message,
  metadata = {},
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      metadata,
    });

    // Emit real-time event to the recipient's personal socket room
    try {
      const io = getIO();
      io.to(`user-${recipientId}`).emit("notification", {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    } catch (socketErr) {
      // Socket not initialized or user offline — notification still saved to DB
      logger.warn(`Socket emit skipped for user ${recipientId}: ${socketErr.message}`);
    }

    return notification;
  } catch (error) {
    logger.error("sendNotification error:", error);
    throw error;
  }
};


// ─── Campaign Creator ──────────

export const notifyCampaignApproved = async ({ creatorId, campaignId, campaignTitle }) => {
  await sendNotification({
    recipientId: creatorId,
    type: "CAMPAIGN_APPROVED",
    title: "Campaign Approved 🎉",
    message: `Your campaign "${campaignTitle}" has been approved and is now live.`,
    metadata: { campaignId },
  });
};


export const notifyDonationReceived = async ({
  creatorId,
  campaignId,
  donationId,
  campaignTitle,
  amount,
  donorName,
}) => {
  await sendNotification({
    recipientId: creatorId,
    type: "DONATION_RECEIVED",
    title: "New Donation Received 💰",
    message: `${donorName} donated $${amount} to your campaign "${campaignTitle}".`,
    metadata: { campaignId, donationId },
  });
};


// ─── Backer  ────────

export const notifyDonationConfirmed = async ({
  donorId,
  campaignId,
  donationId,
  campaignTitle,
  amount,
}) => {
  await sendNotification({
    recipientId: donorId,
    type: "DONATION_CONFIRMED",
    title: "Donation Confirmed ✅",
    message: `Your donation of $${amount} to "${campaignTitle}" has been confirmed. Thank you!`,
    metadata: { campaignId, donationId },
  });
};


export const notifyRefundSubmitted = async ({ donorId, campaignId, donationId, campaignTitle }) => {
  await sendNotification({
    recipientId: donorId,
    type: "REFUND_SUBMITTED",
    title: "Refund Request Received 📩",
    message: `Your refund request for the donation to "${campaignTitle}" has been submitted and is under review.`,
    metadata: { campaignId, donationId },
  });
};


export const notifyRefundUnderReview = async ({ donorId, campaignId, donationId, campaignTitle }) => {
  await sendNotification({
    recipientId: donorId,
    type: "REFUND_REVIEW",
    title: "Refund Under Review 🔍",
    message: `Your refund request for "${campaignTitle}" is currently being reviewed by our team.`,
    metadata: { campaignId, donationId },
  });
};


export const notifyRefundProcessed = async ({
  donorId,
  campaignId,
  donationId,
  campaignTitle,
  amount,
}) => {
  await sendNotification({
    recipientId: donorId,
    type: "REFUND_PROCESSED",
    title: "Refund Processed 💸",
    message: `Your refund of $${amount} for "${campaignTitle}" has been processed. It may take 5–10 business days to appear.`,
    metadata: { campaignId, donationId },
  });
};


// ─── Representation ───────────────

export const notifyRepresentationSubmitted = async ({
  creatorId,
  campaignId,
  representationId,
  campaignTitle,
  applicantName,
}) => {
  await sendNotification({
    recipientId: creatorId,
    type: "REPRESENTATION_SUBMITTED",
    title: "New Representation Application 📋",
    message: `${applicantName} has applied to represent your campaign "${campaignTitle}".`,
    metadata: { campaignId, representationId },
  });
};


export const notifyRepresentationApproved = async ({
  applicantId,
  campaignId,
  representationId,
  campaignTitle,
}) => {
  await sendNotification({
    recipientId: applicantId,
    type: "REPRESENTATION_APPROVED",
    title: "Representation Approved 🌟",
    message: `Congratulations! Your application to represent "${campaignTitle}" has been approved.`,
    metadata: { campaignId, representationId },
  });
};


export const notifyRepresentationRejected = async ({
  applicantId,
  campaignId,
  representationId,
  campaignTitle,
}) => {
  await sendNotification({
    recipientId: applicantId,
    type: "REPRESENTATION_REJECTED",
    title: "Representation Application Rejected",
    message: `Unfortunately, your application to represent "${campaignTitle}" was not approved at this time.`,
    metadata: { campaignId, representationId },
  });
};