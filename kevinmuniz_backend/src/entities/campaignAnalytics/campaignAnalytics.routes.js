import express from "express";
import {
  getCampaignDashboardController,
  getCreatorDashboardStatsController,
  getCreatorDashboardOverviewController,
} from "./campaignAnalytics.controller.js";
import { verifyToken, creatorMiddleware } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


// Authenticated users — campaign dashboard with year filter
router.get("/dashboard", verifyToken, getCampaignDashboardController);

// Creator — stats only (Total Raised, Active Campaigns, Total Donors, Avg Donation)
router.get("/creator-dashboard/stats", verifyToken, creatorMiddleware, getCreatorDashboardStatsController);

// Creator — my campaigns + recent donors
router.get("/creator-dashboard/overview", verifyToken, creatorMiddleware, getCreatorDashboardOverviewController);


export default router;
