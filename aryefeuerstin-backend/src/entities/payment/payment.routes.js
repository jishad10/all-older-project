import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import { createReturnOrderCheckout } from './payment.controller.js';

const router = express.Router();

router.post(
  "/checkout/return-order",
  verifyToken,
  createReturnOrderCheckout
);

export default router;
