// src/modules/contact/contact.routes.js
import express from 'express';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} from './contact.controller.js';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

// Public: submit contact form
router.post('/', createContact);

// Admin: manage contacts
router.get('/', verifyToken, adminMiddleware, getContacts);
router.get('/:id', verifyToken, adminMiddleware, getContactById);
router.put('/:id', verifyToken, adminMiddleware, updateContact);
router.delete('/:id', verifyToken, adminMiddleware, deleteContact);

export default router;
