import mongoose from "mongoose";

const customContactSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  businessHour: {
    type: String,
    required: true
  }
}, { timestamps: true });

export const CustomContact = mongoose.model("CustomContact", customContactSchema);