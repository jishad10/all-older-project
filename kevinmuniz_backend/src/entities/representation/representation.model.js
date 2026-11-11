import mongoose from "mongoose";

const { Schema } = mongoose;

const representationSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    productionCompany: {
      type: String,
      trim: true,
      default: "",
    },

    imdbPageLink: {
      type: String,
      trim: true,
      default: "",
    },

    cv: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// One user can only apply once per campaign
representationSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

const Representation = mongoose.model("Representation", representationSchema);
export default Representation;