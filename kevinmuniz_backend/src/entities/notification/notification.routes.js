import express from "express";
import {
  getMyNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
  deleteNotificationController,
} from "./notification.controller.js";
import { verifyToken } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


router.use(verifyToken);

router.get("/my", getMyNotificationsController);

router.patch("/read-all", markAllNotificationsReadController);

router.patch("/:notificationId/read", markNotificationReadController);

router.delete("/:notificationId", deleteNotificationController);

export default router;