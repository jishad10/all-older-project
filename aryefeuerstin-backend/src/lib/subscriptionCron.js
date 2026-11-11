import cron from 'node-cron';
import User from '../entities/auth/auth.model.js';
import sendEmail from './sendEmail.js';
import { subscriptionExpiredTemplate } from './emailTemplates.js';


const handleExpiredSubscriptions = async () => {
  console.log('[CRON] Checking expired subscriptions...');

  try {
    const now = new Date();

    const expiredUsers = await User.find({
      hasActiveSubscription: true,
      subscriptionExpireDate: { $lte: now }
    }).populate('subscription.planId');

    console.log(`[CRON] Found ${expiredUsers.length} expired subscription(s)`);

    for (const user of expiredUsers) {
      try {
        // 1. Grab plan BEFORE resetting subscription
        const plan = user.subscription?.planId;

        // 2. Reset ALL subscription fields to initial state
        user.hasActiveSubscription = false;
        user.subscriptionExpireDate = null;
        user.subscription = {
          planId: null,
          startDate: null,
          endDate: null
        };
        user.subscriptionUsage = { returnOrdersUsed: 0 };
        user.searchUsage = { used: 0, resetDate: null };
        await user.save();

        // 3. Send expiry email
        if (user.email) {
          const html = subscriptionExpiredTemplate({ user, plan });

          await sendEmail({
            to: user.email,
            subject: 'Your subscription has expired',
            html
          });

          console.log(`[CRON] Expiry email sent to ${user.email}`);
        }
      } catch (userError) {
        console.error(`[CRON] Failed for user ${user._id}:`, userError);
      }
    }
  } catch (error) {
    console.error('[CRON] Subscription check failed:', error);
  }
};

export const startSubscriptionCron = () => {
  cron.schedule('0 8 * * *', handleExpiredSubscriptions, {
    timezone: 'UTC'
  });

  console.log('[CRON] Subscription expiry checker scheduled');
};