import mongoose from "mongoose";

const { Schema } = mongoose;

const donationSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    donorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    stripeSessionId: {
      type: String,
      index: true,
    },

    stripePaymentIntentId: {
      type: String,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },

    refundStatus: {
      type: String,
      enum: ["pending", "review", "refunded", null],
      default: null,
      index: true,
    },

    refundReason: {
      type: String,
      default: null,
      trim: true,
    },

    refundRequestedAt: {
      type: Date,
      default: null,
    },

    refundProcessedAt: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

const Donation = mongoose.model("Donation", donationSchema);
export default Donation;