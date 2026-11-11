import express from 'express';
import { recordSiteVisit, getSiteStats, getAdminStats } from './dashboard.controller.js';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

// Public – frontend calls on every page load
router.post('/visit', recordSiteVisit);

// Public – landing page stats
router.get('/stats', getSiteStats);

// Admin – full stats
router.get('/admin', verifyToken, adminMiddleware, getAdminStats);

export default router;
