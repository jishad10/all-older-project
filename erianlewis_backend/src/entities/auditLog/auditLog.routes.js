import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { getAuditLogs, getAuditLogById } from './auditLog.controller.js';

const router = express.Router();

router.get('/',    verifyToken, adminMiddleware, getAuditLogs);
router.get('/:id', verifyToken, adminMiddleware, getAuditLogById);

export default router;