import { generateResponse } from "../../lib/responseFormate.js";
import {
  getMyNotificationsService,
  markNotificationReadService,
  markAllNotificationsReadService,
  deleteNotificationService,
} from "./notification.service.js";


export const getMyNotificationsController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, unreadOnly } = req.query;

    const data = await getMyNotificationsService({ userId, page, limit, unreadOnly });

    return generateResponse(res, 200, true, "Notifications fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const markNotificationReadController = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const data = await markNotificationReadService({ notificationId, userId });

    return generateResponse(res, 200, true, "Notification marked as read", data);
  } catch (error) {
    next(error);
  }
};


export const markAllNotificationsReadController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const data = await markAllNotificationsReadService(userId);

    return generateResponse(res, 200, true, "All notifications marked as read", data);
  } catch (error) {
    next(error);
  }
};


export const deleteNotificationController = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    await deleteNotificationService({ notificationId, userId });

    return generateResponse(res, 200, true, "Notification deleted successfully", null);
  } catch (error) {
    next(error);
  }
};