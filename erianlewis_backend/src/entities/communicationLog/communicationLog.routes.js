import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { getCommunicationLogs } from './communicationLog.controller.js';

const router = express.Router();

// Admin only
router.get('/', verifyToken, adminMiddleware, getCommunicationLogs);

export default router;