import mongoose, { Schema } from "mongoose";

const practiceAreaSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
  },
  {
    timestamps: true
  }
);

const PracticeArea = mongoose.model("PracticeArea", practiceAreaSchema);
export default PracticeArea;
