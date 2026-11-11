import express from "express";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} from "./room.controller.js";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();

// Public routes
router.get("/get-all-rooms", getAllRooms);
router.get("/:id", getRoomById);

// Admin-only routes
router.post(
  "/",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  createRoom
);

router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  updateRoom
);

router.delete("/:id", verifyToken, adminMiddleware, deleteRoom);

export default router;
