import Stripe from 'stripe';
import Plan from '../plan/plan.model.js';
import User from '../auth/auth.model.js';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a plan and throw if missing / inactive.
 */
const getActivePlan = async (planId) => {
  const plan = await Plan.findById(planId);
  if (!plan)                    throw new Error('Plan not found');
  if (plan.status !== 'active') throw new Error('Selected plan is not active');
  return plan;
};

/**
 * Resolve a user and throw if missing.
 */
const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user;
};

/**
 * Check that the user currently has an active subscription.
 */
const assertActiveSubscription = (user) => {
  if (!user.hasActiveSubscription || !user.subscription?.planId) {
    throw new Error('You do not have an active subscription');
  }
};

const getSubscriptionEffectiveDate = (user) =>
  user.subscriptionExpireDate || user.subscription?.endDate || new Date();

const clearActiveSubscription = (user) => {
  user.hasActiveSubscription  = false;
  user.subscription           = { planId: null, startDate: null, endDate: null };
  user.subscriptionExpireDate = null;
  user.pendingPlan            = { action: null, planId: null, createdAt: null };
  user.stripeCheckoutUrl      = null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. UPGRADE  (takes effect immediately — user pays now for the new plan)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe checkout session for upgrading to a more-expensive plan.
 * The webhook (checkout.session.completed) will immediately replace the user's
 * current subscription when payment succeeds.
 *
 * @param {string} userId
 * @param {string} newPlanId
 * @returns {string} Stripe checkout URL
 */
export const upgradeSubscriptionService = async (userId, newPlanId) => {
  const [user, newPlan] = await Promise.all([
    getUser(userId),
    getActivePlan(newPlanId),
  ]);

  assertActiveSubscription(user);

  // Prevent upgrading to the same plan
  if (user.subscription.planId.toString() === newPlanId) {
    throw new Error('You are already on this plan');
  }

  // Fetch the current plan to verify it is indeed an upgrade (higher price)
  const currentPlan = await Plan.findById(user.subscription.planId);
  if (currentPlan && newPlan.price <= currentPlan.price) {
    throw new Error(
      'Selected plan is not an upgrade. Use the downgrade endpoint instead.'
    );
  }

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
            description: `${newPlan.billingCycle} — up to ${newPlan.maxProperties ?? 'unlimited'} properties`,
          },
          unit_amount: Math.round(newPlan.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId:       userId.toString(),
      planId:       newPlanId.toString(),
      billingCycle: newPlan.billingCycle,
      action:       'upgrade',   // <-- tells the webhook what to do
    },
    success_url: `${process.env.FRONTEND_URL}/subscription-success`,
    cancel_url:  `${process.env.FRONTEND_URL}/subscription-cancel`,
  });

  return session.url;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DOWNGRADE  (scheduled — applied when current subscription expires)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedules a downgrade to a cheaper plan.
 * The current plan stays active until subscriptionExpireDate.
 * A cron job (applyPendingSubscriptionChanges) applies the change at expiry.
 *
 * No payment is taken now — the user will pay for the cheaper plan on renewal.
 *
 * @param {string} userId
 * @param {string} newPlanId
 * @returns {object} summary
 */
export const downgradeSubscriptionService = async (userId, newPlanId) => {
  const [user, newPlan] = await Promise.all([
    getUser(userId),
    getActivePlan(newPlanId),
  ]);

  assertActiveSubscription(user);

  if (user.subscription.planId.toString() === newPlanId) {
    throw new Error('You are already on this plan');
  }

  const currentPlan = await Plan.findById(user.subscription.planId);
  if (currentPlan && newPlan.price >= currentPlan.price) {
    throw new Error(
      'Selected plan is not a downgrade. Use the upgrade endpoint instead.'
    );
  }

  const effectiveDate = getSubscriptionEffectiveDate(user);

  // Schedule the downgrade — do NOT touch the active subscription yet
  user.pendingPlan = {
    action:    'downgrade',
    planId:    newPlanId,
    createdAt: new Date(),
  };

  await user.save({ validateBeforeSave: false });

  return {
    message:       'Downgrade scheduled',
    effectiveDate,
    newPlan: {
      id:    newPlan._id,
      name:  newPlan.title || newPlan.name,
      price: newPlan.price,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CANCEL  (scheduled — applied when current subscription expires)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedules a cancellation.
 * The subscription stays active until subscriptionExpireDate, then it's removed.
 *
 * @param {string} userId
 * @returns {object} summary
 */
export const cancelSubscriptionService = async (userId) => {
  const user = await getUser(userId);

  assertActiveSubscription(user);

  // If there's already a pending cancel, don't overwrite with duplicate
  if (user.pendingPlan?.action === 'cancel') {
    throw new Error('Cancellation is already scheduled for this subscription');
  }

  const effectiveDate = getSubscriptionEffectiveDate(user);

  if (!user.subscriptionExpireDate && !user.subscription?.endDate) {
    clearActiveSubscription(user);
    await user.save({ validateBeforeSave: false });

    return {
      message:       'Subscription cancelled',
      effectiveDate,
    };
  }

  user.pendingPlan = {
    action:    'cancel',
    planId:    null,
    createdAt: new Date(),
  };

  await user.save({ validateBeforeSave: false });

  return {
    message:       'Subscription cancellation scheduled',
    effectiveDate,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. REVOKE PENDING CHANGE  (undo a scheduled downgrade or cancel)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lets a user reverse a scheduled downgrade or cancellation before it kicks in.
 *
 * @param {string} userId
 * @returns {object} summary
 */
export const revokePendingSubscriptionChangeService = async (userId) => {
  const user = await getUser(userId);

  if (!user.pendingPlan?.action) {
    throw new Error('No pending subscription change to revoke');
  }

  const previousAction = user.pendingPlan.action;

  user.pendingPlan = { action: null, planId: null, createdAt: null };

  await user.save({ validateBeforeSave: false });

  return {
    message: `Scheduled ${previousAction} has been revoked. Your current plan remains active.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. BUY NEW SUBSCRIPTION  (first-time purchase for already-active users)
//    — Original service kept for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe checkout session for an existing active user
 * who wants to buy a subscription for the first time.
 */
export const createSubscriptionCheckoutService = async (userId, planId) => {
  const [plan, user] = await Promise.all([
    getActivePlan(planId),
    getUser(userId),
  ]);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.title || plan.name,
            description: `${plan.billingCycle} — up to ${plan.maxProperties ?? 'unlimited'} properties`,
          },
          unit_amount: Math.round(plan.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId:       userId.toString(),
      planId:       planId.toString(),
      billingCycle: plan.billingCycle,
      action:       'new_subscription',
    },
    success_url: `${process.env.FRONTEND_URL}/subscription-success`,
    cancel_url:  `${process.env.FRONTEND_URL}/subscription-cancel`,
  });

  return session.url;
};
