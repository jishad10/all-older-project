import { generateResponse } from "../../lib/responseFormate.js";
import { cancelSubscriptionService, createSubscriptionCheckoutService, downgradeSubscriptionService, revokePendingSubscriptionChangeService, upgradeSubscriptionService } from "./subscription.service.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const handle = (res, fn) =>
  fn.catch((error) => {
    const status =
      error.message === 'Plan not found' || error.message === 'User not found'
        ? 404
        : error.message === 'Selected plan is not active' ||
          error.message.startsWith('You are already') ||
          error.message.startsWith('Selected plan is not') ||
          error.message.startsWith('You do not have') ||
          error.message.startsWith('No pending') ||
          error.message.startsWith('Cancellation is already')
        ? 400
        : 500;
    return generateResponse(res, status, false, error.message, null);
  });

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /subscription/buy/:planId
 * First-time subscription purchase (already-active users).
 */
export const createSubscriptionCheckout = (req, res) =>
  handle(
    res,
    createSubscriptionCheckoutService(req.user._id, req.params.planId).then((url) =>
      generateResponse(res, 200, true, 'Checkout session created', { url })
    )
  );

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /subscription/upgrade/:planId
 * Immediate upgrade — user pays now, plan switches right away via webhook.
 */
export const upgradeSubscription = (req, res) =>
  handle(
    res,
    upgradeSubscriptionService(req.user._id, req.params.planId).then((url) =>
      generateResponse(res, 200, true, 'Upgrade checkout session created', { url })
    )
  );

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /subscription/downgrade/:planId
 * Scheduled downgrade — takes effect when current plan expires.
 */
export const downgradeSubscription = (req, res) =>
  handle(
    res,
    downgradeSubscriptionService(req.user._id, req.params.planId).then((data) =>
      generateResponse(res, 200, true, data.message, data)
    )
  );

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /subscription/cancel
 * Scheduled cancellation — takes effect when current plan expires.
 */
export const cancelSubscription = (req, res) =>
  handle(
    res,
    cancelSubscriptionService(req.user._id).then((data) =>
      generateResponse(res, 200, true, data.message, data)
    )
  );

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /subscription/revoke-pending
 * Undo a scheduled downgrade or cancellation before it takes effect.
 */
export const revokePendingSubscriptionChange = (req, res) =>
  handle(
    res,
    revokePendingSubscriptionChangeService(req.user._id).then((data) =>
      generateResponse(res, 200, true, data.message, data)
    )
  );