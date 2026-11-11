import express from "express";
import { verifyToken, landlordOrAgentMiddleware } from "../../core/middlewares/authMiddleware.js";
import { getOwnerDashboardStats } from "./ownerDashboard.controller.js";

const router = express.Router();

// Landlord/Agent dashboard stats
router.get("/", verifyToken, landlordOrAgentMiddleware, getOwnerDashboardStats);

export default router;
