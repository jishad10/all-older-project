// src/entities/Seller/Stripe-onboard/sellerStripeRoutes.js

import express from 'express';
import {
  createConnectedAccountOnboardingLinkController,
  stripeAccountController
} from './sellerStripeController.js';          // ← FIXED: use ./

const router = express.Router();

router.route('/onboard')
  .post(createConnectedAccountOnboardingLinkController)
  .get(stripeAccountController);   

export default router;