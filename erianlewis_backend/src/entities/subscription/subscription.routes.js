import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import { cancelSubscription, createSubscriptionCheckout, downgradeSubscription, revokePendingSubscriptionChange, upgradeSubscription } from './subscription.controller.js';

const router = express.Router();

// ── All routes require authentication ─────────────────────────────────────────

/**
 * POST /subscription/buy/:planId
 * First-time plan purchase for an already-active user (no existing subscription).
 */
router.post('/buy/:planId', verifyToken, createSubscriptionCheckout);

/**
 * POST /subscription/upgrade/:planId
 * Immediately upgrade to a higher-priced plan.
 * Triggers a Stripe checkout — plan is swapped as soon as payment succeeds.
 */
router.post('/upgrade/:planId', verifyToken, upgradeSubscription);

/**
 * POST /subscription/downgrade/:planId
 * Schedule a downgrade to a cheaper plan.
 * Current plan stays active until it expires; cheaper plan kicks in after that.
 * No payment taken now.
 */
router.post('/downgrade/:planId', verifyToken, downgradeSubscription);

/**
 * POST /subscription/cancel
 * Schedule a cancellation.
 * Current plan stays active until it expires; subscription ends after that.
 * No refund issued.
 */
router.post('/cancel', verifyToken, cancelSubscription);

/**
 * POST /subscription/revoke-pending
 * Undo a scheduled downgrade or cancellation before it takes effect.
 */
router.post('/revoke-pending', verifyToken, revokePendingSubscriptionChange);

export default router;