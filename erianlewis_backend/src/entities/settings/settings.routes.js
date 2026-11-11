import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../core/middlewares/multer.js';
import {
  getSettings,
  getSettingsSection,
  upsertSettings,
  upsertSettingsSection,
  deleteSettingsSection,
} from './settings.controller.js';

const router = express.Router();

const pdfUpload = multerUpload([
  { name: 'termsOfServicePdf',       maxCount: 1 },
  { name: 'privacyPolicyPdf',        maxCount: 1 },
  { name: 'licensingInformationPdf', maxCount: 1 },
]);

const getPublicLegalSection = (section) => (req, res, next) => {
  req.params.section = section;
  return getSettingsSection(req, res, next);
};

// ─── Public legal documents ───────────────────────────────────────────────────
router.get('/termsOfService',       getPublicLegalSection('termsOfService'));
router.get('/privacyPolicy',        getPublicLegalSection('privacyPolicy'));
router.get('/licensingInformation', getPublicLegalSection('licensingInformation'));

// ─── Full document ─────────────────────────────────────────────────────────────
router.get('/', verifyToken, adminMiddleware, getSettings);
router.put('/', verifyToken, adminMiddleware, pdfUpload, upsertSettings);

// ─── Single section ────────────────────────────────────────────────────────────
router.get('/:section',    verifyToken, adminMiddleware, getSettingsSection);
router.put('/:section',    verifyToken, adminMiddleware, pdfUpload, upsertSettingsSection);
router.delete('/:section', verifyToken, adminMiddleware, deleteSettingsSection);

export default router;
