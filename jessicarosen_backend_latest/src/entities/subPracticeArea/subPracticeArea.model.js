// models/SubCategory.js
import mongoose, { Schema } from "mongoose";

const subPracticeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "PracticeArea",
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("SubPracticeArea", subPracticeSchema);
