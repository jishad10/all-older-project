import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    thumbnail: {
        type: String,
    },
  },
  {
    timestamps: true
  }
);

const Blog= mongoose.model("Blog", blogSchema);
export default Blog;
