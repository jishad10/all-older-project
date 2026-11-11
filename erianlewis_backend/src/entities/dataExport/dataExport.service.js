import User from '../auth/auth.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import AuditLog from '../auditLog/auditLog.model.js';
import RoleType from '../../lib/types.js';
import { createAuditLog } from '../auditLog/auditLog.helper.js';


// ─── EXPORT ALL ACCOUNTS ─────────────────────
export const exportAccountsService = async (adminId, adminEmail) => {
  const users = await User.find({
    role: { $in: [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT] },
  })
    .select('firstName lastName email phone role accountStatus hasActiveSubscription subscription individual business createdAt')
    .populate('subscription.planId', 'name title price billingCycle')
    .populate('individual.operatingLocations', 'name')
    .populate('business.operatingLocations', 'name')
    .sort({ createdAt: -1 });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'data_export',
    entity:  { type: 'user', id: null, label: 'All Accounts Export' },
    details: { count: users.length },
  });

  return users;
};


// ─── EXPORT ALL LISTINGS ─────────────────────
export const exportListingsService = async (adminId, adminEmail) => {
  const listings = await RentalProperty.find()
    .populate('basicInformation.propertyType', 'name')
    .populate('address.island', 'name')
    .populate('createdBy', 'firstName lastName email role')
    .sort({ createdAt: -1 });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'data_export',
    entity:  { type: 'property', id: null, label: 'All Listings Export' },
    details: { count: listings.length },
  });

  return listings;
};


// ─── EXPORT REVENUE DATA ─────────────────────
export const exportRevenueService = async (adminId, adminEmail) => {
  const users = await User.find({
    role: { $in: [RoleType.LANDLORD, RoleType.AGENT] },
    hasActiveSubscription: true,
    'subscription.planId': { $ne: null },
  })
    .select('firstName lastName email role subscription hasActiveSubscription subscriptionExpireDate createdAt')
    .populate('subscription.planId', 'name title price billingCycle')
    .sort({ 'subscription.startDate': -1 });

  const totalRevenue = users.reduce((sum, u) => sum + (u.subscription?.planId?.price || 0), 0);

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'data_export',
    entity:  { type: 'platform_config', id: null, label: 'Revenue Data Export' },
    details: { count: users.length, totalRevenue },
  });

  return { totalRevenue, subscriptions: users };
};


// ─── EXPORT AUDIT LOGS ───────────────────────
export const exportAuditLogsService = async (adminId, adminEmail) => {
  const logs = await AuditLog.find()
    .populate('actor.userId', 'firstName lastName email')
    .sort({ createdAt: -1 });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'data_export',
    entity:  { type: 'platform_config', id: null, label: 'Audit Logs Export' },
    details: { count: logs.length },
  });

  return logs;
};


// ─── RECENT EXPORTS (from audit logs) ────────
export const getRecentExportsService = async () => {
  return AuditLog.find({ action: 'data_export' })
    .populate('actor.userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(20);
};
