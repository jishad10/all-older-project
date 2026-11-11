// src/entities/Payment/stripeWebhook.controller.js
import Stripe from 'stripe';
import Order from './order.model.js';
import { fulfillOrder } from './orderFulfillment.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- Ack Stripe immediately -------------------------------------------
  // Everything below (DB writes, stock updates, emails) can legitimately
  // take a few seconds. Stripe expects a fast 2xx and will start retrying
  // (with backoff, up to 3 days) if it doesn't get one quickly — retries
  // just add load and risk duplicate-processing races, they don't help us.
  // The signature is already verified above, so it's safe to acknowledge
  // now and do the real work after responding.
  res.status(200).json({ received: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        await handleFailedPayment(event.data.object);
        break;

      default:
        break;
    }
  } catch (err) {
    // Response has already been sent — this is now just for our own logs/alerting.
    console.error(`Webhook processing error for event ${event.id} (${event.type}):`, err);
  }
};

const handleCheckoutCompleted = async (session) => {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn('checkout.session.completed with no orderId in metadata:', session.id);
    return;
  }

  await fulfillOrder({
    orderId,
    transactionId: session.payment_intent,
    amountTotalCents: session.amount_total,
    taxAmountCents: session.total_details?.amount_tax || 0,
    buyerEmail: session.customer_details?.email || session.customer_email
  });
};

// Real fallback (previously a no-op stub). Because payment.service.js now
// mirrors metadata onto payment_intent_data, this can independently fulfill
// an order even if checkout.session.completed is ever missed/misdelivered —
// two separate Stripe event types both pointing at the same orderId.
//
// IMPORTANT: this event can arrive before, after, or concurrently with
// checkout.session.completed (Stripe fires several events per checkout
// almost simultaneously, and we no longer serialize processing behind the
// HTTP response). Whichever handler wins the atomic "claim this order" race
// in fulfillOrder() is the one whose data actually gets used — so this path
// must not rely on `paymentIntent.receipt_email`, which is essentially never
// populated in a normal Checkout Session flow. Instead, look up the
// Checkout Session tied to this PaymentIntent to get the real customer
// email, so fulfillment is correct regardless of event arrival order.
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return; // nothing to correlate this to

  let buyerEmail = paymentIntent.receipt_email || null;

  if (!buyerEmail) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1
      });
      const session = sessions.data[0];
      buyerEmail = session?.customer_details?.email || session?.customer_email || null;
    } catch (err) {
      console.error('Failed to look up checkout session for payment_intent', paymentIntent.id, err.message);
    }
  }

  await fulfillOrder({
    orderId,
    transactionId: paymentIntent.id,
    amountTotalCents: paymentIntent.amount_received ?? paymentIntent.amount,
    buyerEmail
  });
};

const handleFailedPayment = async (failedObject) => {
  const orderId = failedObject.metadata?.orderId;
  if (!orderId) return;

  await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: 'paid' } },
    {
      paymentStatus: 'failed',
      failureReason: failedObject.last_payment_error?.message || 'Payment failed'
    }
  );
};