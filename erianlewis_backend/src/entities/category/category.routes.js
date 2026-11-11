import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  getAllCategories,
  adminGetAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './category.controller.js';

const router = express.Router();

// Public — frontend reads for landing page + property form
router.get('/', getAllCategories);

// Admin
router.get  ('/admin',    verifyToken,  adminGetAllCategories);
router.post ('/admin',    verifyToken, adminMiddleware, createCategory);
router.put  ('/admin/:id',verifyToken, adminMiddleware, updateCategory);
router.delete('/admin/:id',verifyToken, adminMiddleware, deleteCategory);

export default router;