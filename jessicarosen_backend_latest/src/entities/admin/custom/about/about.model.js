import mongoose, { Schema } from "mongoose";

const aboutSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },

  },
  {
    timestamps: true,
  }
);

const About = mongoose.model("About", aboutSchema);
export default About;
