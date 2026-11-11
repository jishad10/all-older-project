import { generateResponse } from '../../lib/responseFormate.js';
import Guest from '../auth.guest/auth.guest.model.js';
import User from '../auth/auth.model.js'; // Make sure this import exists
import { createCheckoutSession } from './payment.service.js';

export const initiateCheckout = async (req, res) => {
  const userId = req.user?.id || null;
  console.log('userId', userId);
  console.log('Full request body:', req.body);

  let guestId = null;
  let customerEmail = null;

  // ── 1. Handle guest checkout ──
  if (!userId) {
    if (!req.body.guest || !req.body.guest.email) {
      return generateResponse(res, 400, false, 'Email is required for guest checkout');
    }

    const guestEmailInput = req.body.guest.email.trim();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmailInput)) {
      return generateResponse(res, 400, false, 'Invalid email format');
    }

    try {
      const guestDoc = await Guest.create({
        ...req.body.guest,
        email: guestEmailInput, // ensure trimmed
      });
      guestId = guestDoc._id;
      customerEmail = guestEmailInput;
    } catch (error) {
      console.error('Guest creation error:', error);
      return generateResponse(res, 500, false, 'Failed to create guest record', error.message);
    }
  }

  // ── 2. Handle logged-in user ──
  else {
    try {
      const user = await User.findById(userId).select('email').lean();
      if (!user || !user.email) {
        return generateResponse(res, 400, false, 'No email found for your account. Please update your profile.');
      }

      const userEmail = user.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        return generateResponse(res, 400, false, 'Invalid email format in your account');
      }

      customerEmail = userEmail;
    } catch (error) {
      console.error('User fetch error:', error);
      return generateResponse(res, 500, false, 'Failed to verify user email');
    }
  }

  // ── Common validation after email is secured ──
  const items = req.body.items;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return generateResponse(res, 400, false, 'No items provided');
  }

  try {
    const result = await createCheckoutSession({
      userId,
      guestId,
      itemsFromFrontend: items,
      promoCode: req.body.promoCode,
      customerCountry: req.body.customerCountry || 'CA',
      customerEmail,          // ← Now always present and valid
    });

    // Single seller response
    if (result.sessions.length === 1) {
      return generateResponse(res, 200, true, 'Checkout session created successfully', {
        sessionId: result.sessions[0].sessionId,
        url: result.sessions[0].url,
        orderId: result.sessions[0].orderId,
      });
    }

    // Multi-seller response
    return generateResponse(res, 200, true, 'Checkout sessions created successfully', {
      sessions: result.sessions.map(s => ({
        sessionId: s.sessionId,
        url: s.url,
        orderId: s.orderId,
        sellerStripeId: s.sellerStripeId,
      })),
      total: result.totalPreTax,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return generateResponse(
      res,
      500,
      false,
      error.message || 'Checkout session creation failed'
    );
  }
};