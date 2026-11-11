import Room from "./room.model.js";
import mongoose from "mongoose";


export const createRoomService = async (data) => {
  const room = new Room(data);
  return await room.save();
};


export const getAllRoomsService = async () => {
  return await Room.find().sort({ createdAt: -1 });
};


export const getRoomByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Room.findById(id);
};


export const updateRoomService = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Room.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  })
};


export const deleteRoomService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const result = await Room.findByIdAndDelete(id);
  return result ? true : false;
};
