import express from "express";
import {
  createCampaign,
  getAllCampaigns,
  getCampaignById,   
  deleteCampaign,
  updateCampaign,
  updateCampaignStatus,
  closeCampaign
} from "./campaign.controller.js";
import { verifyToken, adminMiddleware, creatorMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();


router.post(
  "/",
  verifyToken,
  creatorMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  createCampaign
);

router.get(
  "/",
  verifyToken, 
  getAllCampaigns
);

router.get(
  "/:id",
  verifyToken,
  getCampaignById
);

router.put(
  "/:id/status",
  verifyToken,
  adminMiddleware,
  updateCampaignStatus
);

router.put(
  "/:id",
  verifyToken,
  multerUpload([{ name: "image", maxCount: 1 }]),
  updateCampaign
);


router.put("/:id/close", verifyToken, closeCampaign);


router.delete(
  "/:id",
  verifyToken,
  deleteCampaign
);


export default router;
