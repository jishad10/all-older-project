import express from 'express';

import {
  getAllHeroSectionsController,
  getHeroSectionByIdController,
  createHeroSectionController,
  updateHeroSectionController,
  deleteHeroSectionController
} from './herosection.controller.js';
import { adminMiddleware ,verifyToken} from '../../../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../../../core/middlewares/multer.js';

const router = express.Router();

// Admin protected routes for Hero Section
router.get('/', getAllHeroSectionsController);
router.get('/:id',  getHeroSectionByIdController);
router.post('/', verifyToken, adminMiddleware,multerUpload([{ name: "image", maxCount: 1 }]), createHeroSectionController);
router.put('/:id', verifyToken, adminMiddleware,multerUpload([{ name: "image", maxCount: 1 }]), updateHeroSectionController);
router.delete('/:id', verifyToken, adminMiddleware, deleteHeroSectionController);

export default router;

