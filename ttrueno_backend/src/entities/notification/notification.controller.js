import { generateResponse } from '../../lib/responseFormate.js';
import {
  createNotificationService,
  listNotificationsByUserService,
  markAllNotificationsAsReadService,
  markNotificationAsReadService
} from './notification.service.js';

export const createNotification = async (req, res, next) => {
  try {
    const notification = await createNotificationService({ ...req.body, user: req.user._id });
    generateResponse(res, 201, true, 'Notification created successfully', notification);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};

export const listNotificationsByUser = async (req, res, next) => {
  try {
    const notifications = await listNotificationsByUserService(req.user._id);
    generateResponse(res, 200, true, 'Notifications fetched successfully', notifications);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await markNotificationAsReadService(req.params.id, req.user._id);
    generateResponse(res, 200, true, 'Notification marked as read', notification);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
}; 

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await markAllNotificationsAsReadService(req.user._id);
    generateResponse(res, 200, true, 'All notifications marked as read', result);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};
