import mongoose, { Schema } from "mongoose";

const bestsellerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: [{
      type: String,
      required: true,
    }],
  },
  {
    timestamps: true,
  }
);

const BestSeller = mongoose.model("BestSeller", bestsellerSchema);
export default BestSeller;
