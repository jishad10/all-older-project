import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { getBilling, getBillingDetail } from './billing.controller.js';

const router = express.Router();

// Admin only
router.get('/',           verifyToken, adminMiddleware, getBilling);
router.get('/:userId',    verifyToken, adminMiddleware, getBillingDetail);

export default router;