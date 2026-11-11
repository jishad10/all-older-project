import express from 'express';
import {
  getAllBestSellersController,
  getBestSellerByIdController,
  createBestSellerController,
  updateBestSellerController,
  deleteBestSellerController
} from './bestseller.controller.js';

import { verifyToken, adminMiddleware } from '../../../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../../../core/middlewares/multer.js';

const router = express.Router();

// Admin protected routes for Bestseller
router.get('/',  getAllBestSellersController);
router.get('/:id', getBestSellerByIdController);
router.post(
  '/',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 2 }]),
  createBestSellerController
);
router.put(
  '/:id',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 2 }]),
  updateBestSellerController
);
router.delete('/:id', verifyToken, adminMiddleware, deleteBestSellerController);

export default router;
