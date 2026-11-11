// src/entities/Payment/orderFulfillment.service.js
//
// Single source of truth for "what happens when a payment is confirmed paid".
// Used by:
//   - stripeWebhook.controller.js  (checkout.session.completed / payment_intent.succeeded)
//   - reconciliation.service.js    (catch-up job for orders Stripe never notified us about)
//
// Kept idempotent via an atomic findOneAndUpdate guard, so it's safe to call
// this twice for the same order (webhook retry + reconciliation both firing, etc.)

import crypto from 'crypto';
import Order from './order.model.js';
import Resource from '../resource/resource.model.js';
import sendEmail from '../../lib/sendEmail.js';

/**
 * Marks an order as paid and runs all post-purchase side effects
 * (stock decrement, download token, buyer/seller emails).
 *
 * @param {Object} params
 * @param {String} params.orderId
 * @param {String} [params.transactionId]      Stripe PaymentIntent id
 * @param {Number} [params.amountTotalCents]    Total charged, in cents (session.amount_total)
 * @param {Number} [params.taxAmountCents]       Tax portion, in cents
 * @param {String} [params.buyerEmail]
 * @returns {Promise<{ status: 'fulfilled' | 'already_fulfilled' | 'not_found' }>}
 */
export const fulfillOrder = async ({
  orderId,
  transactionId = null,
  amountTotalCents = null,
  taxAmountCents = null,
  buyerEmail = null
}) => {
  if (!orderId) {
    console.warn('[fulfillOrder] Missing orderId, skipping');
    return { status: 'not_found' };
  }

  // Atomic claim: only one caller can flip pending -> paid for this order.
  // If two triggers (webhook + reconciliation) race, only the first wins here;
  // the second gets null back and exits without re-running side effects.
  const updateFields = {
    paymentStatus: 'paid',
    paidAt: new Date()
  };
  if (transactionId) updateFields.transactionId = transactionId;
  if (amountTotalCents != null) updateFields.totalAmount = amountTotalCents / 100;
  if (taxAmountCents != null) updateFields.taxAmount = taxAmountCents / 100;
  if (buyerEmail) updateFields.guestEmail = buyerEmail;

  const claimedOrder = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: 'paid' } },
    { $set: updateFields },
    { new: true }
  );

  if (!claimedOrder) {
    // Either the order doesn't exist, or it was already marked paid
    // (by a previous webhook delivery, a retry, or reconciliation).
    const exists = await Order.exists({ _id: orderId });
    return { status: exists ? 'already_fulfilled' : 'not_found' };
  }

  // Bulk stock decrement (single round trip instead of one update per line item)
  if (claimedOrder.items?.length) {
    const bulkOps = claimedOrder.items.map((item) => ({
      updateOne: {
        filter: { _id: item.resource },
        update: { $inc: { quantity: -item.quantity } }
      }
    }));
    await Resource.bulkWrite(bulkOps, { ordered: false }).catch((err) =>
      console.error('[fulfillOrder] Stock decrement failed for order', orderId, err)
    );
  }

  // Download token
  const downloadToken = crypto.randomBytes(32).toString('hex');
  const fullOrder = await Order.findByIdAndUpdate(
    orderId,
    { downloadToken },
    { new: true }
  )
    .populate('items.resource')
    .populate('items.seller', 'firstName email')
    .populate('user', 'firstName email')
    .lean();

  // Fallback chain: whatever Stripe told us at call time -> previously saved
  // guestEmail -> the buyer's own account email (for logged-in purchases,
  // this should basically never be empty, so it's a solid last resort if
  // Stripe ever fails to supply an email through any of the other paths).
  const resolvedBuyerEmail = buyerEmail || fullOrder.guestEmail || fullOrder.user?.email;

  // Fire emails in the background — a slow/broken SMTP server should never
  // block order fulfillment or make Stripe think delivery failed.
  sendEmails(fullOrder, resolvedBuyerEmail).catch((err) =>
    console.error('[fulfillOrder] sendEmails failed for order', orderId, err)
  );

  return { status: 'fulfilled', order: fullOrder };
};

const sendEmails = async (order, buyerEmail) => {
  try {
    if (!buyerEmail) {
      console.warn('No buyer email available for order:', order._id);
      return;
    }
    const isGuest = !order.user;

    const buyerHtml = `
  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; line-height: 1.6;">
    <h2 style="color: #2c5d7c;">Thank you for your purchase on Lawbie! 🎉</h2>

    <p>Hi ${isGuest ? 'there' : (order.user?.firstName || 'Customer')},</p>
    <p>Your payment was successful. Below are your purchased document(s):</p>

    <div style="margin: 24px 0;">
      ${order.items.map((item, index) => {
        const resource = item.resource;
        const title = resource?.title || `Item ${index + 1}`;
        const downloadUrl = resource?.file?.url;

        return downloadUrl ? `
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #f9fcff;">
            <div style="font-weight: bold; margin-bottom: 8px;">${title}</div>
            <small style="color: #555;">Quantity: ${item.quantity} | Price: $${(item.price || 0).toFixed(2)}</small>
            <div style="margin-top: 12px;">
              <a href="${downloadUrl}"
                 style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Download Now
              </a>
            </div>
          </div>
        ` : `
          <div style="border: 1px solid #ffcccc; padding: 16px; border-radius: 8px; background: #fff5f5; margin-bottom: 16px;">
            <strong>${title}</strong> — File not available. Please contact support.
          </div>
        `;
      }).join('')}
    </div>

    ${isGuest ? `
      <p style="color: #d32f2f; font-size: 0.95em;">
        <strong>Important:</strong> These links are personal & secure. Do not share them.
        Links will remain active for 30 days from purchase.
      </p>
    ` : `
      <p>You can also access all your purchases anytime from your account:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${process.env.FRONTEND_URL}/account/orders"
           style="background: #1976d2; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View My Orders
        </a>
      </p>
    `}

    <p style="margin-top: 32px;">
      Questions? Reach us at <a href="mailto:support@lawbie.com">support@lawbie.com</a>
    </p>

    <p>Thank you for supporting legal content creators!<br/>
    <strong>The Lawbie Team</strong><br/>
    <a href="https://lawbie.com" style="color: #1976d2;">www.lawbie.com</a></p>
  </div>
`;

    await sendEmail({
      to: buyerEmail,
      subject: 'Your Lawbie Purchase – Files Ready! 🧾',
      html: buyerHtml
    });

    const firstItem = order.items[0];
    const seller = firstItem?.seller;
    if (seller?.email) {
      const sellerShare = (Object.values(order.sellerShares || {})[0] || 0) / 100;

      const sellerHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Hi ${seller.firstName || 'Seller'},</p>
          <p>Great news — <strong>${firstItem?.resource?.title || 'your product'}</strong> was just sold on Lawbie! 🎉</p>
          <p><strong>You’ve earned $${sellerShare.toFixed(2)}</strong> from this sale.</p>
          <p>Funds are being processed via Stripe.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View in Dashboard
            </a>
          </p>
          <p>Best,<br/><strong>The Lawbie Team</strong></p>
        </div>
      `;

      await sendEmail({
        to: seller.email,
        subject: "New Sale on Lawbie – You've Earned Money! 🎉",
        html: sellerHtml
      });
    }
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
};