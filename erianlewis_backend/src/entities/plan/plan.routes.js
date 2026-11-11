import express from "express";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";
import {
  createPlanController,
  getPlansController,
  getPlanByIdController,
  updatePlanController,
  deletePlanController,
  getRecentTransactionsController,
  getRecentTransactionByIdController,
  getMembershipsController
} from "./plan.controller.js";

const router = express.Router();

router.get("/recent-transactions", verifyToken, adminMiddleware, getRecentTransactionsController);
router.get("/recent-transactions/:id", verifyToken, adminMiddleware, getRecentTransactionByIdController);

router.post("/", verifyToken, adminMiddleware, createPlanController);
router.get("/", getPlansController);
router.get("/memberships", verifyToken, adminMiddleware, getMembershipsController);

router.get("/:id", verifyToken, adminMiddleware, getPlanByIdController);
router.put("/:id", verifyToken, adminMiddleware, updatePlanController);
router.delete("/:id", verifyToken, adminMiddleware, deletePlanController);

export default router;