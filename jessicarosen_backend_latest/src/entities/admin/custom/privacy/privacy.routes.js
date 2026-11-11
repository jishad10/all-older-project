import express from 'express';
import {
  getAllPrivacyController,
  getPrivacyByIdController,
  createPrivacyController,
  updatePrivacyController,
  deletePrivacyController
} from './privacy.controller.js';

import { adminMiddleware, verifyToken } from '../../../../core/middlewares/authMiddleware.js';

const router = express.Router();

// No image upload required
router.get('/',  getAllPrivacyController);
router.get('/:id',  getPrivacyByIdController);
router.post('/',verifyToken,  adminMiddleware, createPrivacyController);
router.put('/:id',verifyToken,  adminMiddleware, updatePrivacyController);
router.delete('/:id',verifyToken,  adminMiddleware, deletePrivacyController);

export default router;
