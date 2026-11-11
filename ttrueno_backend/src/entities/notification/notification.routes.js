import express from 'express';
import {
  createNotification,
  listNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from './notification.controller.js';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createNotification);
router.get('/user', verifyToken, listNotificationsByUser);
router.put('/:id/read', verifyToken, markNotificationAsRead);
router.put('/read-all', verifyToken, markAllNotificationsAsRead);

export default router; 