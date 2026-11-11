// scripts/reconcilePendingOrders.js
//
// One-off / cron-able CLI runner. Connects to Mongo directly, runs the same
// reconciliation logic the admin API endpoint uses, and prints a summary.
//
// Usage:
//   node scripts/reconcilePendingOrders.js
//   node scripts/reconcilePendingOrders.js --olderThanMinutes=5 --maxAgeDays=60
//
// This is the fastest way to unstick orders (like the client's) that have
// been sitting at paymentStatus: "pending" because the webhook never arrived
// — it doesn't wait for a redeploy, and it doesn't require replaying anything
// from the Stripe dashboard.

import mongoose from 'mongoose';
import { mongoURI } from '../core/config/config.js';
import { reconcilePendingOrders } from '../entities/Payment/reconciliation.service.js';

const parseArgs = () => {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.+)$/);
    if (match) args[match[1]] = Number(match[2]);
  }
  return args;
};

const run = async () => {
  const { olderThanMinutes, maxAgeDays } = parseArgs();

  await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB. Running reconciliation...\n');

  const results = await reconcilePendingOrders({
    olderThanMinutes,
    maxAgeDays
  });

  console.log(`Checked:      ${results.checked} pending order(s)`);
  console.log(`Fulfilled:    ${results.fulfilled.length}`);
  results.fulfilled.forEach((r) => console.log(`   ✔ ${r.orderId} (${r.outcome})`));
  console.log(`Still unpaid: ${results.stillUnpaid.length}`);
  console.log(`Expired:      ${results.expired.length}`);
  console.log(`Errors:       ${results.errors.length}`);
  results.errors.forEach((e) => console.log(`   ✘ ${e.orderId}: ${e.error}`));

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Reconciliation script failed:', err);
  process.exit(1);
});