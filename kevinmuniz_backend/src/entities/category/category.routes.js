import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory
} from "./category.controller.js";

import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();

// Public
router.get("/get-all-categories", getAllCategories);
router.get("/:id", getCategoryById);

// Admin
router.post(
  "/",
  verifyToken,
  adminMiddleware,
  createCategory
);

router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  updateCategory
);

router.delete("/:id", verifyToken, adminMiddleware, deleteCategory);

export default router;
