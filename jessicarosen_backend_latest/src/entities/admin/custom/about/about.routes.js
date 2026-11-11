import express from "express";
import {
  getAllAboutsController,
  getAboutByIdController,
  createAboutController,
  updateAboutController,
  deleteAboutController
} from "./about.controller.js";

import { adminMiddleware, verifyToken } from "../../../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../../../core/middlewares/multer.js";

const router = express.Router();

// Admin protected routes for About section
router.get("/",  getAllAboutsController);
router.get("/:id", getAboutByIdController);
router.post(
  "/",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  createAboutController
);
router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  updateAboutController
);
router.delete("/:id", verifyToken, adminMiddleware, deleteAboutController);

export default router;
