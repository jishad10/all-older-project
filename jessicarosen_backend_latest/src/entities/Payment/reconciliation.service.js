// src/entities/Payment/reconciliation.service.js
//
// Safety net for exactly the failure mode the client hit: a Checkout Session
// completes and Stripe charges the card successfully, but the webhook never
// reaches the server (misconfigured/missing endpoint, wrong signing secret,
// endpoint pointed at the wrong Stripe account, temporary outage, etc).
//
// This asks Stripe directly "was this session actually paid?" for any order
// that's been sitting in `pending` too long, and fulfills it if so.

import Stripe from 'stripe';
import Order from './order.model.js';
import { fulfillOrder } from './orderFulfillment.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

/**
 * @param {Object} options
 * @param {Number} [options.olderThanMinutes=10]  Only look at orders created more than this long ago
 *                                                  (avoids racing a checkout that's still in progress)
 * @param {Number} [options.maxAgeDays=30]         Ignore ancient abandoned carts
 * @param {Number} [options.limit=200]             Safety cap per run
 */
export const reconcilePendingOrders = async ({
  olderThanMinutes = 10,
  maxAgeDays = 30,
  limit = 200
} = {}) => {
  const now = Date.now();
  const cutoff = new Date(now - olderThanMinutes * 60 * 1000);
  const floor = new Date(now - maxAgeDays * 24 * 60 * 60 * 1000);

  const candidates = await Order.find({
    paymentStatus: 'pending',
    stripeSessionId: { $ne: null },
    createdAt: { $lte: cutoff, $gte: floor }
  })
    .select('_id stripeSessionId createdAt')
    .limit(limit)
    .lean();

  const results = {
    checked: candidates.length,
    fulfilled: [],
    stillUnpaid: [],
    expired: [],
    errors: []
  };

  for (const order of candidates) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

      if (session.payment_status === 'paid') {
        const outcome = await fulfillOrder({
          orderId: order._id.toString(),
          transactionId: session.payment_intent,
          amountTotalCents: session.amount_total,
          taxAmountCents: session.total_details?.amount_tax || 0,
          buyerEmail: session.customer_details?.email || session.customer_email
        });
        results.fulfilled.push({ orderId: order._id.toString(), outcome: outcome.status });
      } else if (session.status === 'expired') {
        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: 'failed',
          failureReason: 'Checkout session expired without payment'
        });
        results.expired.push(order._id.toString());
      } else {
        results.stillUnpaid.push(order._id.toString());
      }
    } catch (err) {
      console.error('[reconcilePendingOrders] Failed for order', order._id.toString(), err.message);
      results.errors.push({ orderId: order._id.toString(), error: err.message });
    }
  }

  return results;
};