import mongoose from "mongoose";

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    returnOrder: {
      type: Schema.Types.ObjectId,
      ref: "ReturnOrder",
      required: true,
      index: true
    },

    stripeSessionId: {
      type: String,
      required: true,
      unique: true
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "usd"
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELED"],
      default: "PENDING",
      index: true
    }
  },
  { timestamps: true }
);


const Payment =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
