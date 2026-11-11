import mongoose, { Schema } from "mongoose";

const promoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed","percentage", "fixed"],
      required: true,
      default: "Percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    special: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


// Validate expiry date
promoCodeSchema.pre("save", function (next) {
  if (this.expiryDate <= new Date()) {
    return next(new Error("Expiration date must be in the future"));
  }
  next();
});


// Validate usage limit
promoCodeSchema.pre("save", function (next) {
  if (this.usageLimit < this.usedCount) {
    return next(new Error("Usage limit cannot be less than the number of times used"));
  }
  next();
});


// Index for faster search
promoCodeSchema.index({ code: 1 });

const PromoCode = mongoose.model("PromoCode", promoCodeSchema);
export default PromoCode;
