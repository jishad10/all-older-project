import mongoose, { Schema } from "mongoose";

const heroSectionSchema = new Schema(
  {
    image: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const HeroSection = mongoose.model("HeroSection", heroSectionSchema);
export default HeroSection;
