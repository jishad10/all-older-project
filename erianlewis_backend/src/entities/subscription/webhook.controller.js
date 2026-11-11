import Stripe from 'stripe';
import User from '../auth/auth.model.js';
import Plan from '../plan/plan.model.js';
import sendEmail from '../../lib/sendEmail.js';
import { getSubscriptionPaymentConfirmationTemplate } from '../../lib/emailTemplates.js';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sendSubscriptionPaymentConfirmationEmail = async ({
  user,
  plan,
  stripeSessionId,
  amount,
  currency = 'USD',
  paymentDate,
  subscriptionStartDate,
  subscriptionEndDate,
}) => {
  try {
    await sendEmail({
      to: user.email,
      subject: 'Payment successful - your subscription is now active',
      html: getSubscriptionPaymentConfirmationTemplate({
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there',
        accountRole: user.role || 'Account',
        planName: plan?.title || plan?.name || 'Subscription plan',
        billingCycle: plan?.billingCycle
          ? `${plan.billingCycle.charAt(0).toUpperCase()}${plan.billingCycle.slice(1)}`
          : 'Subscription',
        amount,
        currency,
        stripeSessionId,
        paymentDate,
        subscriptionStartDate,
        subscriptionEndDate,
      }),
    });
  } catch (error) {
    console.error('[Webhook][PaymentEmail] Failed to send confirmation email:', error.message);
  }
};

/**
 * Stripe Webhook — checkout.session.completed
 *
 * Handles 4 payment actions via the `action` metadata field:
 *
 *  1. 'new_subscription' (or no action)
 *     → Registration payment OR first-time plan purchase for an active user.
 *     → Activate account + set subscription.
 *
 *  2. 'upgrade'
 *     → User paid for a higher plan immediately.
 *     → Replace current subscription right now.
 *     → Clear any pending downgrade/cancel (user changed their mind).
 *
 *  3. 'downgrade_payment'
 *     → Cron detected a scheduled downgrade to a PAID plan at expiry.
 *     → Cron already deactivated the old subscription + created this checkout.
 *     → Now user has paid → activate the new cheaper plan.
 *
 *  4. (extensible) — add more actions in metadata as needed.
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
 
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
 
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).send('Webhook received');
  }
 
  try {
    const session = event.data.object;
    const { userId, planId, action } = session.metadata || {};
    let   { billingCycle }           = session.metadata || {};
 
    if (!userId || !planId) {
      return res.status(400).send('Missing metadata in session');
    }
 
    const [user, plan] = await Promise.all([
      User.findById(userId),
      Plan.findById(planId),
    ]);
 
    if (!user) return res.status(400).send('User not found');
    if (!plan) return res.status(400).send('Plan not found');
 
    if (!billingCycle) {
      billingCycle = plan.billingCycle;
    }
 
    // ── Calculate subscription dates ──────────────────────────────────────────
    const startDate = new Date();
    let   endDate   = null;
 
    if (billingCycle === 'monthly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    // 'free' → endDate stays null
 
    // ── Common fields for all payment actions ─────────────────────────────────
    user.accountStatus          = 'active';
    user.hasActiveSubscription  = true;
    user.subscription           = { planId: plan._id, startDate, endDate };
    user.subscriptionExpireDate = endDate;
    user.stripeSessionId        = session.id;
    user.stripeCheckoutUrl      = null; // clear any stored checkout URL
 
    // ── Action-specific logic ─────────────────────────────────────────────────
 
    if (action === 'upgrade') {
      // Immediate upgrade — clear any pending downgrade/cancel the user had
      user.pendingPlan = { action: null, planId: null, createdAt: null };
      console.log(`[Webhook] Subscription UPGRADED for user: ${userId} → plan: ${plan.name}`);
 
    } else if (action === 'downgrade_payment') {
      // Cron already cleared pendingPlan and deactivated the old subscription.
      // User has now paid for the cheaper plan — activate it.
      user.pendingPlan = { action: null, planId: null, createdAt: null };
      console.log(`[Webhook] Downgrade payment completed for user: ${userId} → plan: ${plan.name}`);
 
    } else {
      // 'new_subscription' or registration payment — standard flow
      console.log(`[Webhook] Subscription ACTIVATED for user: ${userId} → plan: ${plan.name}`);
    }
 
    await user.save({ validateBeforeSave: false });

    await sendSubscriptionPaymentConfirmationEmail({
      user,
      plan,
      stripeSessionId: session.id,
      amount: typeof session.amount_total === 'number' ? session.amount_total / 100 : plan?.price,
      currency: session.currency || 'USD',
      paymentDate: session.created ? new Date(session.created * 1000) : startDate,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });
 
    return res.status(200).send('Webhook received');
 
  } catch (error) {
    console.error('[Webhook] Handler error:', error.message);
    return res.status(500).send(`Webhook handler error: ${error.message}`);
  }
};
