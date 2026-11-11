import mongoose, { Schema } from "mongoose";


const replySchema = new Schema(
  {
    message: {
      type: String,
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);


const questionSchema = new Schema(
  {
    resource: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    askedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", 
    },
    replies: [replySchema],
    isAnswered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


const ResourceQuestion = mongoose.model("ResourceQuestion", questionSchema);
export default ResourceQuestion;
