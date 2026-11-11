import mongoose, { Schema } from "mongoose";

const privacySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

const Privacy = mongoose.model("Privacy", privacySchema);
export default Privacy;
