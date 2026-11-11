import mongoose from "mongoose";

const driverWorkSessionSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    punchInAt: {
      type: Date,
      required: true
    },

    punchOutAt: {
      type: Date,
      default: null
    },

    totalMinutes: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED"],
      default: "IN_PROGRESS"
    }
  },
  { timestamps: true }
);

export default mongoose.model(
  "DriverWorkSession",
  driverWorkSessionSchema
);
