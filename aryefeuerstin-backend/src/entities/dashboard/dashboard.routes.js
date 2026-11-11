// src/entities/dashboard/dashboard.routes.js
import express from "express";
import { verifyToken, superAdminOrAdminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { getDashboardGrowthController, getDashboardTotalsController,getDashboardReturnOrdersController } from "./dashboard.controller.js";

const router = express.Router();

// totals: totalUsers + totalApprovedDrivers
router.get("/totals", verifyToken, superAdminOrAdminMiddleware, getDashboardTotalsController);
router.get("/growth", verifyToken, superAdminOrAdminMiddleware, getDashboardGrowthController);
router.get("/return-orders", verifyToken, superAdminOrAdminMiddleware, getDashboardReturnOrdersController);

export default router;
