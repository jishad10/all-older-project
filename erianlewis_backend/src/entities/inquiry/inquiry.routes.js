import express from 'express';
import { verifyToken, adminMiddleware, landlordOrAgentMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  createInquiry,
  getLandlordInquiries,
  getLandlordInquiryById,
  replyToInquiry,
  updateInquiryStatus,
  adminGetAllInquiries,
  adminGetInquiryById,
  addAdminNote,
  deleteAdminNote,
  adminDeleteInquiry,
} from './inquiry.controller.js';

const router = express.Router();

// Public — anyone can submit an inquiry (optionally logged in)
router.post('/', createInquiry);

// Landlord / Agent — manage their inquiries
router.get ('/',         verifyToken, landlordOrAgentMiddleware, getLandlordInquiries);
router.get ('/:id',      verifyToken, landlordOrAgentMiddleware, getLandlordInquiryById);
router.post('/:id/reply', verifyToken, replyToInquiry);
router.put('/:id/status', verifyToken, landlordOrAgentMiddleware, updateInquiryStatus);

// Admin
router.get   ('/admin/all',  verifyToken, adminMiddleware, adminGetAllInquiries);
router.get   ('/admin/:id',   verifyToken, adminMiddleware, adminGetInquiryById);
router.post  ('/admin/:id/notes', verifyToken, adminMiddleware, addAdminNote);
router.delete('/admin/:id/notes/:noteId', verifyToken, adminMiddleware, deleteAdminNote);
router.delete('/admin/:id', verifyToken, adminMiddleware, adminDeleteInquiry);

export default router;