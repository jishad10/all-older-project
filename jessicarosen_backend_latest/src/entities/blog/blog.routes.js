import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog
} from "./blog.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();

// Public routes
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

// Admin protected
router.post(
  "/",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "thumbnail", maxCount: 1 }]),
  createBlog
);

router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "thumbnail", maxCount: 1 }]), 
  updateBlog
);

router.delete("/:id", verifyToken, adminMiddleware, deleteBlog);

export default router;
