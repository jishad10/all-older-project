import User from '../auth/auth.model.js';
import RoleType from '../../lib/types.js';
import { createPaginationInfo } from '../../lib/pagination.js';


/**
 * Get all billing records — users with active subscriptions
 * Filters: search (name/email), planId, billingCycle
 */
export const getBillingService = async ({ page = 1, limit = 10, search, planId, billingCycle }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {
    role: { $in: [RoleType.LANDLORD, RoleType.AGENT] },
    hasActiveSubscription: true,
    'subscription.planId': { $ne: null },
  };

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
      { phone:     { $regex: search, $options: 'i' } },
    ];
  }

  if (planId) filter['subscription.planId'] = planId;

  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select('firstName lastName email phone role accountStatus profileImage subscription hasActiveSubscription subscriptionExpireDate individual business')
    .populate('subscription.planId', 'name title price billingCycle maxProperties')
    .populate('individual.operatingLocations', 'name')
    .populate('business.operatingLocations', 'name')
    .sort({ 'subscription.startDate': -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  // filter by billingCycle after populate
  let filtered = users;
  if (billingCycle) {
    filtered = users.filter(u => u.subscription?.planId?.billingCycle === billingCycle);
  }

  // total revenue — sum of all active subscription plan prices
  const revenueResult = await User.aggregate([
    { $match: { hasActiveSubscription: true, 'subscription.planId': { $ne: null } } },
    { $lookup: { from: 'plans', localField: 'subscription.planId', foreignField: '_id', as: 'plan' } },
    { $unwind: '$plan' },
    { $group: { _id: null, totalRevenue: { $sum: '$plan.price' } } },
  ]);

  const totalRevenue = revenueResult[0]?.totalRevenue || 0;

  return {
    totalRevenue,
    billing: filtered,
    paginationInfo: createPaginationInfo(numericPage, numericLimit, total),
  };
};


/**
 * Get single billing detail — full user + plan info
 */
export const getBillingDetailService = async (userId) => {
  const user = await User.findById(userId)
    .select('-password -otp -otpExpires -otpVerified -resetExpires -refreshToken -__v')
    .populate('subscription.planId', 'name title price billingCycle maxProperties displayFeatures')
    .populate('individual.operatingLocations', 'name')
    .populate('business.operatingLocations', 'name');

  if (!user) throw new Error('User not found');
  if (!user.hasActiveSubscription) throw new Error('User has no active subscription');

  return user;
};