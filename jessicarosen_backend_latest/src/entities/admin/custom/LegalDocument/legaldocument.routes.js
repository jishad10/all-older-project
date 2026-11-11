import express from 'express';
import {
  getAllLegalDocumentsController,
  getLegalDocumentByIdController,
  createLegalDocumentController,
  updateLegalDocumentController,
  deleteLegalDocumentController
} from './legaldocument.controller.js';
import { adminMiddleware, verifyToken } from '../../../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../../../core/middlewares/multer.js';

const router = express.Router();

router.get('/',  getAllLegalDocumentsController);
router.get('/:id', getLegalDocumentByIdController);
router.post(
  '/',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  createLegalDocumentController
);
router.put(
  '/:id',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "image", maxCount: 1 }]),
  updateLegalDocumentController
);
router.delete('/:id', verifyToken, adminMiddleware, deleteLegalDocumentController);

export default router;
