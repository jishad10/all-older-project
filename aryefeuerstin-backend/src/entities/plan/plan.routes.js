import express from "express";
import { verifyToken, superAdminOrAdminMiddleware } from "../../core/middlewares/authMiddleware.js";
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

router.get("/recent-transactions",verifyToken, superAdminOrAdminMiddleware, getRecentTransactionsController);

router.get("/recent-transactions/:id",verifyToken,superAdminOrAdminMiddleware, getRecentTransactionByIdController);

router.post("/", verifyToken, superAdminOrAdminMiddleware, createPlanController);
router.get("/", getPlansController);
router.get("/memberships", verifyToken, superAdminOrAdminMiddleware, getMembershipsController);

router.get("/:id", verifyToken, superAdminOrAdminMiddleware, getPlanByIdController);
router.put("/:id", verifyToken, superAdminOrAdminMiddleware, updatePlanController);
router.delete("/:id", verifyToken, superAdminOrAdminMiddleware, deletePlanController);

export default router;
