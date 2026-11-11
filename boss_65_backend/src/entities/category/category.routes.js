import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory
} from "./category.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();

// Public routes
router.get("/get-all-categories", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes
router.post(
  "/",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  createCategory
);

router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  updateCategory
);

router.delete("/:id", verifyToken, adminMiddleware, deleteCategory);

export default router;
