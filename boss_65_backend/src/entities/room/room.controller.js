import * as roomService from "./room.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";


export const createRoom = async (req, res) => {
  try {
    const { title,maxCapacity,status } = req.body;
    const file = req.files?.image?.[0];

    if (!file) {
      return generateResponse(res, 400, false, "Image is required");
    }

    const uploadResult = await cloudinaryUpload(file.path, `room_${Date.now()}`, "room/images");

    const room = await roomService.createRoomService({
      title,

      maxCapacity,
      status,
      image: uploadResult.secure_url
    });

    generateResponse(res, 201, true, "Room created successfully", room);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create room", error.message);
  }
};


export const getAllRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRoomsService();
    generateResponse(res, 200, true, "Rooms fetched successfully", rooms);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch rooms", error.message);
  }
};


export const getRoomById = async (req, res) => {
  try {
    const room = await roomService.getRoomByIdService(req.params.id);
    if (!room) {
      return generateResponse(res, 404, false, "Room not found");
    }
    generateResponse(res, 200, true, "Room fetched successfully", room);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch room", error.message);
  }
};


export const updateRoom = async (req, res) => {
  try {
    const { title,  maxCapacity, status } = req.body;
    const file = req.files?.image?.[0];

    let updateData = {};
    if (title) updateData.title = title;
    
    if (maxCapacity) updateData.maxCapacity = maxCapacity;
    if (status) updateData.status = status;

    if (file) {
      const result = await cloudinaryUpload(file.path, `room_${Date.now()}`, "room/images");
      updateData.image = result.secure_url;
    }

    const updatedRoom = await roomService.updateRoomService(req.params.id, updateData);
    if (!updatedRoom) {
      return generateResponse(res, 404, false, "Room not found");
    }

    generateResponse(res, 200, true, "Room updated successfully", updatedRoom);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update room", error.message);
  }
};


export const deleteRoom = async (req, res) => {
  try {
    const deleted = await roomService.deleteRoomService(req.params.id);
    if (!deleted) {
      return generateResponse(res, 404, false, "Room not found");
    }
    generateResponse(res, 200, true, "Room deleted successfully");
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete room", error.message);
  }
};
