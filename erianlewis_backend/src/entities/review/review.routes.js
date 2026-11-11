import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  createReview,
  getPropertyReviews,
  getMyReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  adminGetAllReviews,
  toggleReviewStatus,
  adminDeleteReview,
  bulkDeleteReviews,
  bulkHideReviews,
  bulkUnhideReviews,
} from './review.controller.js';

const router = express.Router();

// Public
router.get('/property/:propertyId', getPropertyReviews);

// User
router.post('/', verifyToken, createReview);
router.get ('/my', verifyToken, getMyReviews);

// Admin list
router.get ('/all', verifyToken, adminMiddleware, adminGetAllReviews);

// Admin bulk (before /:id)
router.delete('/bulk/delete', verifyToken, adminMiddleware, bulkDeleteReviews);
router.put   ('/bulk/hide',   verifyToken, adminMiddleware, bulkHideReviews);
router.put   ('/bulk/unhide', verifyToken, adminMiddleware, bulkUnhideReviews);

// Admin single toggle
router.patch ('/:id/toggle', verifyToken, adminMiddleware, toggleReviewStatus);
router.put   ('/:id/toggle', verifyToken, adminMiddleware, toggleReviewStatus);
router.get ('/:id', verifyToken, getSingleReview);
router.put ('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);

// Admin single delete
router.delete('/admin/:id', verifyToken, adminMiddleware, adminDeleteReview);

export default router;