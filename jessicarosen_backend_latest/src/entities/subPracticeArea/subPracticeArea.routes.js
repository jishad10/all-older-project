import express from "express";
import {
  createSubResourceType,
  deleteSubResourceType,
  getAllSubResourceTypes,
  getSubResourceTypeById,
  updateSubResourceType
} from "./subPracticeArea.controller.js";

import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/all", getAllSubResourceTypes);
router.get("/:id", getSubResourceTypeById);

// Admin
router.post("/", verifyToken, adminMiddleware, createSubResourceType);
router.put("/:id", verifyToken, adminMiddleware, updateSubResourceType);
router.delete("/:id", verifyToken, adminMiddleware, deleteSubResourceType);

export default router;
