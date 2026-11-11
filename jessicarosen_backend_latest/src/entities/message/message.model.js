import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    resource: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true
    },
    messages:[
        {
            message: {
                type: String,
                required: true
            },
            sender: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            read: {
                type: Boolean,
                default: false
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
  },
  {
    timestamps: true
  }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
