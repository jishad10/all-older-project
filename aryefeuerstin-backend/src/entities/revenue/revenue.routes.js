import express from "express";
import { verifyToken, superAdminOrAdminMiddleware } from "../../core/middlewares/authMiddleware.js";
import {
  getRevenueSummaryController,
  getRevenueListController,
  getRevenueByIdController
} from "./revenue.controller.js";

const router = express.Router();

// total revenue (PAID only)
router.get("/summary", verifyToken, superAdminOrAdminMiddleware, getRevenueSummaryController);

// table list (pagination + search + status)
router.get("/", verifyToken, superAdminOrAdminMiddleware, getRevenueListController);

// view details (eye icon)
router.get("/:id", verifyToken, superAdminOrAdminMiddleware, getRevenueByIdController);

export default router;
