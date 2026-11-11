import express from 'express';
import { submitContactMessage } from './contact.controller.js';

const router = express.Router();

router.post('/', submitContactMessage);

export default router;
