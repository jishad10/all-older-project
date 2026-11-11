import express from 'express';
import { multerUpload } from '../../core/middlewares/multer.js';
import { verifyToken, adminMiddleware, superAdminOrAdminMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  createBanner,
  updateBanner,
  deleteBanner,
  getBannerById,
  listBanners
} from './banner.controller.js';

const router = express.Router();

// Public single; list now admin-only
router.get('/:bannerId', getBannerById);

// Admin protected
router.get('/', listBanners);
router.post(
  '/',
  verifyToken,
  superAdminOrAdminMiddleware,
  multerUpload([{ name: 'media', maxCount: 1 }]),
  createBanner
);

router.put(
  '/:bannerId',
  verifyToken,
  superAdminOrAdminMiddleware,
  multerUpload([{ name: 'media', maxCount: 1 }]),
  updateBanner
);

router.delete('/:bannerId', verifyToken, superAdminOrAdminMiddleware, deleteBanner);

export default router;
