import mongoose, { Schema } from "mongoose";

const guestSchema = new Schema({
  name: String,
  email: String,
  phone: String,
  address: String
})

const Guest = mongoose.model("Guest", guestSchema);

export default Guest;