// routes/download.js  (অথবা যেখানে এই route আছে)
import express from 'express';
import Order from '../Payment/order.model.js'; // path ঠিক করো
import { optionalVerifyToken, verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import { initiateCheckout } from './payment.controller.js';
import { reconcilePendingOrdersController } from './reconciliation.controller.js';

const router = express.Router();

// Note: /create-session route এখানে রাখা আছে, কিন্তু download-এর সাথে সম্পর্ক নেই
router.post('/create-session', optionalVerifyToken, initiateCheckout);

// Admin-only safety net: catches orders whose webhook never arrived
// (misconfigured/missing Stripe destination, wrong signing secret, outage, etc.)
// and fulfills them by checking directly with Stripe.
// Usage: POST /v1/payment/reconcile-pending?olderThanMinutes=10&maxAgeDays=30
router.post('/reconcile-pending', verifyToken, adminMiddleware, reconcilePendingOrdersController);

router.get('/download', async (req, res) => {
  const { token, orderId } = req.query;

  if (!token || !orderId) {
    return res.status(400).send('Missing token or order ID');
  }

  try {
    const order = await Order.findById(orderId)
      .populate('items.resource', 'title file.url file.filename file.contentType')
      .lean();

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.downloadToken !== token) {
      return res.status(403).send('Invalid or expired download token');
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(403).send('This order has not been paid');
    }

    // 30 দিনের expiry চেক
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (new Date(order.paidAt) < thirtyDaysAgo) {
      return res.status(410).send('Download link has expired (30 days limit)');
    }

    // Optional: একবার ব্যবহারের পর token মুছে ফেলতে চাইলে
    // await Order.findByIdAndUpdate(orderId, { $unset: { downloadToken: "" } });

    // -------------------------------
    // SINGLE ITEM → সরাসরি ফাইল redirect
    // -------------------------------
    if (order.items.length === 1) {
      const resource = order.items[0].resource;
      const fileUrl = resource?.file?.url;

      if (!fileUrl) {
        return res.status(404).send('File not available for this resource');
      }

      // Content-Type সেট করে দিলে browser ভালো handle করে
      // কিন্তু redirect করলে server-এর দরকার নেই — direct URL-এ যদি সঠিক header থাকে
      return res.redirect(fileUrl);
    }

    // -------------------------------
    // MULTIPLE ITEMS → সুন্দর HTML page
    // -------------------------------
    const paidDate = new Date(order.paidAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Lawbie - Your Downloads</title>
        <style>
          :root {
            --primary: #10b981;
            --primary-dark: #059669;
            --text: #1f2937;
            --gray: #6b7280;
            --light: #f8fafc;
            --border: #e2e8f0;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--light);
            color: var(--text);
            margin: 0;
            padding: 0;
            line-height: 1.6;
          }
          .container {
            max-width: 860px;
            margin: 40px auto;
            padding: 0 20px;
          }
          .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(to right, #1e40af, #3b82f6);
            color: white;
            padding: 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
          }
          .content {
            padding: 24px;
          }
          .summary {
            background: var(--light);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 0.95rem;
          }
          .item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
          }
          .item-info {
            flex: 1;
          }
          .item-title {
            font-weight: 600;
            margin: 0 0 4px 0;
            font-size: 1.05rem;
          }
          .download-btn {
            background: var(--primary);
            color: white;
            padding: 10px 22px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
            white-space: nowrap;
          }
          .download-btn:hover {
            background: var(--primary-dark);
          }
          .footer {
            margin-top: 32px;
            text-align: center;
            color: var(--gray);
            font-size: 0.9rem;
          }
          .support {
            color: #3b82f6;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .item { flex-direction: column; align-items: flex-start; gap: 12px; }
            .download-btn { width: 100%; text-align: center; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Your Lawbie Downloads</h1>
            </div>
            <div class="content">
              <div class="summary">
                <strong>Order ID:</strong> ${order._id.toString()}<br>
                <strong>Purchased on:</strong> ${paidDate}<br>
                <strong>Total:</strong> $${(order.totalAmount || 0).toFixed(2)}
              </div>

              <p>Thank you for your purchase! Below are your document(s). Click to download:</p>

              ${order.items
                .map((item, index) => {
                  const res = item.resource;
                  const title = res?.title || `Item ${index + 1}`;
                  const fileUrl = res?.file?.url;

                  return fileUrl
                    ? `
                      <div class="item">
                        <div class="item-info">
                          <div class="item-title">${title}</div>
                          <small>Qty: ${item.quantity} • $${(item.price || 0).toFixed(2)}</small>
                        </div>
                        <a href="${fileUrl}" class="download-btn" download>Download</a>
                      </div>
                    `
                    : `
                      <div class="item" style="border-color: #fecaca; background: #fef2f2;">
                        <div class="item-info">
                          <div class="item-title">${title}</div>
                          <small style="color: #dc2626;">File unavailable — please contact support</small>
                        </div>
                      </div>
                    `;
                })
                .join('')}

              <div class="footer">
                <p>These download links are secure and personal — do not share them.</p>
                <p>Valid for 30 days from purchase date.</p>
                <p>Any issues? <a href="mailto:support@lawbie.com" class="support">Contact support</a></p>
                <p style="margin-top: 20px;">Thank you for choosing Lawbie!</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Download route error:', err);
    res.status(500).send('Something went wrong. Please try again or contact support.');
  }
});

export default router;