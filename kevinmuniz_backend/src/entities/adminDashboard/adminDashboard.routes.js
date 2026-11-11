import express from "express";
import {
  getCampaignWiseRaised,
  getDashboardOverviewController,
  getDonationReportController,
  getUsersByRoleWithCampaignsController,
  getUserWiseRaised,
  toggleUserSuspension,
} from "./adminDashboard.controller.js";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


// Stats + top backers + top campaigns (admin only)
router.get(
  "/overview",
  verifyToken,
  adminMiddleware,
  getDashboardOverviewController
);

// Donation report graph — ?year=2024 (admin only)
router.get(
  "/donation-report",
  verifyToken,
  adminMiddleware,
  getDonationReportController
);

router.get("/users-by-role", verifyToken, adminMiddleware, getUsersByRoleWithCampaignsController);


// GET /api/donation-stats/campaign-wise?page=1&limit=10
router.get(
  "/campaign-wise",
  verifyToken,
  adminMiddleware,
  getCampaignWiseRaised
);

// GET /api/donation-stats/user-wise?page=1&limit=10
router.get(
  "/user-wise",
  verifyToken,
  adminMiddleware,
  getUserWiseRaised
);


router.put(
  "/suspend-user/:userId",
  verifyToken,
  adminMiddleware,
  toggleUserSuspension
)


export default router;