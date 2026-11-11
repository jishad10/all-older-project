// src/modules/contact/contact.routes.js
import express from 'express';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} from './contact.controller.js';
import { verifyToken, superAdminOrAdminMiddleware } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

// Public: submit contact form
router.post('/', createContact);

// Admin: manage contacts
router.get('/', verifyToken, superAdminOrAdminMiddleware, getContacts);
router.get('/:id', verifyToken, superAdminOrAdminMiddleware, getContactById);
router.put('/:id', verifyToken, superAdminOrAdminMiddleware, updateContact);
router.delete('/:id', verifyToken, superAdminOrAdminMiddleware, deleteContact);

export default router;
