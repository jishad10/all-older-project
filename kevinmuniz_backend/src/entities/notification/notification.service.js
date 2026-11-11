import Notification from "./notification.model.js";
import { createPaginationInfo } from "../../lib/pagination.js";


export const getMyNotificationsService = async ({
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { recipientId: userId };
  if (unreadOnly === "true" || unreadOnly === true) {
    filter.isRead = false;
  }

  const [notifications, totalData, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments(filter),

    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);

  return { notifications, pagination, unreadCount };
};


export const markNotificationReadService = async ({ notificationId, userId }) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) throw new Error("Notification not found.");

  return notification;
};


export const markAllNotificationsReadService = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true }
  );

  return { modifiedCount: result.modifiedCount };
};


export const deleteNotificationService = async ({ notificationId, userId }) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipientId: userId,
  });

  if (!notification) throw new Error("Notification not found.");

  return true;
};