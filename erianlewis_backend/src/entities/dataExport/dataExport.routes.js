import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  exportAccounts,
  exportListings,
  exportRevenue,
  exportAuditLogs,
  getRecentExports,
} from './dataExport.controller.js';

const router = express.Router();

// All admin only
router.get('/accounts',   verifyToken, adminMiddleware, exportAccounts);
router.get('/listings',   verifyToken, adminMiddleware, exportListings);
router.get('/revenue',    verifyToken, adminMiddleware, exportRevenue);
router.get('/audit-logs', verifyToken, adminMiddleware, exportAuditLogs);
router.get('/recent',     verifyToken, adminMiddleware, getRecentExports);

export default router;