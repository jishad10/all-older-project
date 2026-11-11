import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    chatRoom: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // sender is required for normal messages but optional for system messages
      required: function () {
        return this.type !== 'system';
      }
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["text", "system", "notification"],
      default: "text"
    },
    attachments: [{ type: String }],
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

messageSchema.index({ chatRoom: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;