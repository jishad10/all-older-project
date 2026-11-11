import express from 'express';
import { adminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';
import { createOrUpdateCmsPage, getAllCmsPages, getCmsPage } from './cms.service.js';


const router = express.Router();

// Admin routes
router.put('/', verifyToken, adminMiddleware, createOrUpdateCmsPage);

// Public routes
router.get('/', getAllCmsPages);
router.get('/:page', getCmsPage);

export default router;