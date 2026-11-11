/**
 * Subscription Expiry Cron Job
 *
 * Runs every hour. For each user whose subscription has expired:
 *
 *  • pendingPlan.action === 'cancel'
 *      → deactivate subscription entirely. Done.
 *
 *  • pendingPlan.action === 'downgrade' + new plan is FREE
 *      → immediately switch to the free plan. No payment needed. Done.
 *
 *  • pendingPlan.action === 'downgrade' + new plan is PAID
 *      → deactivate current subscription (it expired)
 *      → create a Stripe checkout session for the cheaper paid plan
 *      → set accountStatus = 'pending_payment'
 *      → store the checkout URL so the frontend can redirect the user
 *      → user must pay → webhook activates the new plan
 *
 *  • no pendingPlan
 *      → subscription simply expired, deactivate it.
 *
 * Register in your app entry point:
 *   import './cron/subscriptionExpiry.cron.js';
 */


import cron from 'node-cron';
import Stripe from 'stripe';
import Plan from '../entities/plan/plan.model.js';
import User from '../entities/auth/auth.model.js';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 
// ── Helpers ───────────────────────────────────────────────────────────────────
 
/**
 * Calculate subscription start + end dates based on billing cycle.
 */
const calcDates = (billingCycle) => {
  const startDate = new Date();
  let   endDate   = null;
 
  if (billingCycle === 'monthly') {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (billingCycle === 'yearly') {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  // 'free' → endDate stays null (never expires)
 
  return { startDate, endDate };
};
 
/**
 * Fully deactivate a user's subscription.
 * Account itself stays active — just no plan attached.
 */
const deactivateSubscription = (user) => {
  user.hasActiveSubscription  = false;
  user.accountStatus          = 'active';
  user.subscription           = { planId: null, startDate: null, endDate: null };
  user.subscriptionExpireDate = null;
  user.pendingPlan            = { action: null, planId: null, createdAt: null };
  user.stripeCheckoutUrl      = null;
};
 
// ── Core logic ────────────────────────────────────────────────────────────────
 
export const applyPendingSubscriptionChanges = async () => {
  const now = new Date();
 
  // Only users with a finite expiry that has already passed
  const expiredUsers = await User.find({
    hasActiveSubscription:  true,
    subscriptionExpireDate: { $lte: now },
    'subscription.endDate': { $ne: null },
  });
 
  if (!expiredUsers.length) return;
 
  console.log(`[SubscriptionCron] Processing ${expiredUsers.length} expired subscription(s)…`);
 
  for (const user of expiredUsers) {
    try {
      const { action, planId } = user.pendingPlan || {};
 
      // ── CASE 1: Cancel ──────────────────────────────────────────────────────
      if (action === 'cancel') {
        deactivateSubscription(user);
        await user.save({ validateBeforeSave: false });
 
        console.log(`[SubscriptionCron] Subscription cancelled for user: ${user._id}`);
        continue;
      }
 
      // ── CASE 2: Downgrade ───────────────────────────────────────────────────
      if (action === 'downgrade' && planId) {
        const newPlan = await Plan.findById(planId);
 
        // Target plan disappeared or was deactivated — treat as cancel
        if (!newPlan || newPlan.status !== 'active') {
          deactivateSubscription(user);
          await user.save({ validateBeforeSave: false });
 
          console.warn(
            `[SubscriptionCron] Downgrade target plan ${planId} not found/inactive ` +
            `for user ${user._id}. Subscription deactivated.`
          );
          continue;
        }
 
        // ── 2a. FREE plan — switch immediately, no payment needed ─────────────
        if (newPlan.billingCycle === 'free' || newPlan.price === 0) {
          const { startDate, endDate } = calcDates(newPlan.billingCycle);
 
          user.hasActiveSubscription  = true;
          user.accountStatus          = 'active';
          user.subscription           = { planId: newPlan._id, startDate, endDate };
          user.subscriptionExpireDate = endDate;
          user.pendingPlan            = { action: null, planId: null, createdAt: null };
          user.stripeCheckoutUrl      = null;
 
          await user.save({ validateBeforeSave: false });
 
          console.log(
            `[SubscriptionCron] Downgraded user ${user._id} to FREE plan: ${newPlan.name}`
          );
          continue;
        }
 
        // ── 2b. PAID plan — deactivate current, create Stripe checkout ────────
        //
        // Real world flow:
        //   Current plan expired → user wants the cheaper PAID plan
        //   → we cannot activate it for free
        //   → deactivate subscription first
        //   → generate a Stripe checkout link for the new plan
        //   → store it on user (frontend shows "Complete your downgrade — pay now")
        //   → user pays → webhook fires → new plan activated
 
        // Step 1: deactivate the expired subscription
        deactivateSubscription(user);
 
        // Step 2: create Stripe checkout for the cheaper plan
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer_email: user.email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: newPlan.title || newPlan.name,
                  description:
                    `${newPlan.billingCycle} — up to ` +
                    `${newPlan.maxProperties ?? 'unlimited'} properties`,
                },
                unit_amount: Math.round(newPlan.price * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            userId:       user._id.toString(),
            planId:       newPlan._id.toString(),
            billingCycle: newPlan.billingCycle,
            // tells the webhook this came from a scheduled downgrade
            action:       'downgrade_payment',
          },
          success_url: `${process.env.FRONTEND_URL}/subscription-success`,
          cancel_url:  `${process.env.FRONTEND_URL}/subscription-cancel`,
        });
 
        // Step 3: store checkout URL + mark account as pending payment
        user.accountStatus     = 'pending_payment';
        user.stripeSessionId   = session.id;
        user.stripeCheckoutUrl = session.url; // frontend reads this to show "Pay now" button
 
        await user.save({ validateBeforeSave: false });
 
        // Step 4: TODO — send email to user with session.url
        // e.g. await sendDowngradePaymentEmail(user.email, session.url, newPlan);
 
        console.log(
          `[SubscriptionCron] Paid downgrade to plan "${newPlan.name}" requires payment. ` +
          `Checkout created for user: ${user._id}`
        );
        continue;
      }
 
      // ── CASE 3: No pending action — subscription simply expired ─────────────
      deactivateSubscription(user);
      await user.save({ validateBeforeSave: false });
 
      console.log(`[SubscriptionCron] Subscription expired (no pending action) for user: ${user._id}`);
 
    } catch (err) {
      console.error(
        `[SubscriptionCron] Error processing user ${user._id}:`,
        err.message
      );
      // Continue processing remaining users even if one fails
    }
  }
 
  console.log('[SubscriptionCron] Done.');
};
 
// ── Schedule ──────────────────────────────────────────────────────────────────
// '0 * * * *'    → every hour (production)
// '*/15 * * * *' → every 15 minutes (dev / testing)
 
cron.schedule('*/30 * * * *', async () => {
  console.log('[SubscriptionCron] Running expiry check…');
  await applyPendingSubscriptionChanges();
});
 
console.log('[SubscriptionCron] Scheduled — runs every 30 minutes.');