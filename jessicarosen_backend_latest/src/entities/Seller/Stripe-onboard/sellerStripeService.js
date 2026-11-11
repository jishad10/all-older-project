import Stripe from 'stripe';
import User from '../../auth/auth.model.js';   // adjust path

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',   // ← recommended to use recent version
});

export async function createConnectedAccountOnboardingLink(email, country = 'US') {  // default to US for simplicity
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  let accountId = user.stripeAccountId;
  let isNewAccount = false;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country,  // 'US' for US-based testing
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // ── Add this block for pre-filling + test values ──
      individual: {
        first_name: user.firstName || 'Regan',     // or 'Test' / user's real if you have it
        last_name: user.lastName || 'Massey',
        email: email,                              // already there, but explicit is fine
        dob: {
          day: 1,
          month: 1,
          year: 1990   // or 1901 for Stripe's "successful DOB match" test behavior
        },
        address: {
          line1: '123 Main St',              // basic valid-looking
          // line2: 'Apt 4',                 // optional
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US'
        },
        phone: '+12015550123',               // valid US format; or '+10000000000' for test
        // id_number: '000000000'            // full SSN — only if you want to pre-verify (rarely needed for last-4 flow)
      },
      // Optional but helpful defaults
     business_profile: {
  name: `${user.firstName || 'Test'} ${user.lastName || 'User'}`.trim() || 'Test Account',
  url: 'https://accessible.stripe.com',   // ← This passes verification instantly in test mode
  product_description: 'Software services',  // fallback if URL can't be reached
},
    });

    if (!account?.id) {
      throw new Error('Failed to create Stripe connected account');
    }

    accountId = account.id;
    user.stripeAccountId = accountId;
    await user.save();

    isNewAccount = true;
  }

  // Rest of your code (accountLinks.create) remains the same
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.FRONTEND_URL}/connect/refresh`,
    return_url: `${process.env.FRONTEND_URL}/stripe-account-success`,
    type: 'account_onboarding',
    // collect: 'currently_due',  // optional: shows only what's missing
  });

  return {
    url: accountLink.url,
    message: isNewAccount ? 'Stripe onboarding started' : 'Continue setup',
    accountId,
  };
}

export async function stripeAccount(email) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripeAccountId) {
    throw new Error('No Stripe account associated with this user');
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  return {
    id: account.id,
    country: account.country,
    email: account.email,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    requirements: {
      currently_due: account.requirements.currently_due?.length || 0,
      past_due: account.requirements.past_due?.length || 0,
      eventually_due: account.requirements.eventually_due?.length || 0,
      disabled_reason: account.requirements.disabled_reason,
    },
  };
}

// Optional: dashboard login link (only call when you know onboarding is complete)
export async function createDashboardLoginLink(accountId) {
  if (!accountId) throw new Error('No account ID');

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}