import mongoose, { Schema } from "mongoose";


const campaignSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    shortDescription: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    proposedFunding: {
      type: Number,
      required: true
    },

    creatingDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    campaignDetails: {
      type: String,
      required: true
    },

    image: {
      type: String,
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Admin approval status
    approvalStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },

    // Active control 
    activeStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive"
    },

    closedStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    }
  },
  { timestamps: true }
);


const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;