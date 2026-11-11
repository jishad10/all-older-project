import express from "express";
import {
  driverMiddleware,
  verifyToken,
  superAdminOrAdminMiddleware
} from "../../core/middlewares/authMiddleware.js";
import {
  punchIn,
  punchOut,
  getAllDriverWorkingHours
} from "./driverWorkSession.controller.js";

const router = express.Router();

// Driver routes
router.post("/punch-in", verifyToken, driverMiddleware, punchIn);
router.post("/punch-out", verifyToken, driverMiddleware, punchOut);

// Admin route - Get all drivers working hours
router.get("/working-hours",verifyToken,superAdminOrAdminMiddleware,getAllDriverWorkingHours);

export default router;