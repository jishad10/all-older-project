import express from "express";
import {
  createRepresentationController,
  getAllRepresentationsController,
  getAllRepresentationsByCampaignController,
  getRepresentationByIdController,
  getMyRepresentationController,
  updateRepresentationController,
  deleteRepresentationController,
} from "./representation.controller.js";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";



const router = express.Router();


// Get ALL representations across all campaigns (admin) — before /:campaignId to avoid conflict
router.get("/all", verifyToken, adminMiddleware, getAllRepresentationsController);

// Get single by ID (admin)
router.get("/detail/:id", verifyToken, adminMiddleware, getRepresentationByIdController);

// Submit representation for a campaign (any logged-in user)
router.post(
  "/:campaignId",
  verifyToken,
  multerUpload([{ name: "cv", maxCount: 1 }]), // parse multipart/form-data
  createRepresentationController
);

// Get all representations for a specific campaign (admin)
router.get("/:campaignId/all", verifyToken, adminMiddleware, getAllRepresentationsByCampaignController);

// Get my representation for a campaign (logged-in user)
router.get("/:campaignId/me", verifyToken, getMyRepresentationController);

// Update — admin only (fields + status in one body)
router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "cv", maxCount: 1 }]), // parse multipart/form-data
  updateRepresentationController
);

// Delete (own or admin)
router.delete("/:id", verifyToken, deleteRepresentationController);


export default router;