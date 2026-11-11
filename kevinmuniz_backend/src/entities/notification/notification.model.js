import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Notification Types:
 *
 * CAMPAIGN_APPROVED      → creator: their campaign was approved
 * DONATION_RECEIVED      → creator: someone donated to their campaign
 * DONATION_CONFIRMED     → donor:   their payment was confirmed
 * REFUND_SUBMITTED       → donor:   refund request received
 * REFUND_REVIEW          → donor:   refund is under review
 * REFUND_PROCESSED       → donor:   refund has been issued
 * REPRESENTATION_SUBMITTED → creator: someone applied to represent their campaign
 * REPRESENTATION_APPROVED  → applicant: their representation was approved
 * REPRESENTATION_REJECTED  → applicant: their representation was rejected
**/


const notificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "CAMPAIGN_APPROVED",
        "DONATION_RECEIVED",
        "DONATION_CONFIRMED",
        "REFUND_SUBMITTED",
        "REFUND_REVIEW",
        "REFUND_PROCESSED",
        "REPRESENTATION_SUBMITTED",
        "REPRESENTATION_APPROVED",
        "REPRESENTATION_REJECTED",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Optional reference 
    metadata: {
      campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", default: null },
      donationId: { type: Schema.Types.ObjectId, ref: "Donation", default: null },
      representationId: { type: Schema.Types.ObjectId, ref: "Representation", default: null },
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);


notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;