import express from 'express';
import { getAllContactMessages, getContactMessageById, submitContactMessage } from './contact.controller.js';
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', submitContactMessage);

// Admin route
router.get('/', verifyToken, adminMiddleware, getAllContactMessages);
router.get('/:id', verifyToken, adminMiddleware, getContactMessageById);   

export default router;
