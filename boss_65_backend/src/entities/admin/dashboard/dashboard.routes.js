import express from 'express';
import { adminMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';
import { dashboard } from './dasboard.controller.js';


const router = express.Router();

router.use(verifyToken, adminMiddleware);

router.get('/', dashboard);


export default router;