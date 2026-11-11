import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { getCommandCentre } from './commandCentre.controller.js';

const router = express.Router();

// Admin only
router.get('/', verifyToken, adminMiddleware, getCommandCentre);

export default router;