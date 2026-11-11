import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    image: {
      type: String,
      required: true,
      trim: true 
    },
   
    maxCapacity: {
      type: Number,
      required: true,
      min: 1 
    },
    status: {
      type: String,
      enum: ["available", "maintenance", "unavailable"],
      default: "available"
    }
  },
  {
    timestamps: true
  }
);

const Room = mongoose.model("Room", roomSchema);
export default Room;