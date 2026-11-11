import User from '../auth/auth.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import AuditLog from '../auditLog/auditLog.model.js';
import SecurityFlag from '../securityFlag/securityFlag.model.js';
import Plan from '../plan/plan.model.js';
import Island from '../island/island.model.js';
import RoleType from '../../lib/types.js';


export const getCommandCentreService = async () => {
  const [
    totalAccounts,
    totalLandlords,
    totalAgents,
    totalTenants,
    totalListings,
    activeListings,
    totalPlans,
    totalIslands,
    totalSecurityFlags,
    unresolvedFlags,
    activeSubscriptions,
    estimatedRevenue,
    recentActivity,
    subscriptionBreakdown,
    listingsByIsland,
    accountsByIsland,
  ] = await Promise.all([

    // accounts
    User.countDocuments({ role: { $in: [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT] } }),
    User.countDocuments({ role: RoleType.LANDLORD }),
    User.countDocuments({ role: RoleType.AGENT }),
    User.countDocuments({ role: RoleType.USER }),

    // listings
    RentalProperty.countDocuments(),
    RentalProperty.countDocuments({ status: 'active' }),

    // plans & islands
    Plan.countDocuments(),
    Island.countDocuments(),

    // security
    SecurityFlag.countDocuments(),
    SecurityFlag.countDocuments({ resolved: false }),

    // subscriptions
    User.countDocuments({
      role: { $in: [RoleType.LANDLORD, RoleType.AGENT] },
      hasActiveSubscription: true,
    }),

    // estimated monthly revenue — sum plan price of active subscribers
    User.aggregate([
      { $match: { hasActiveSubscription: true, 'subscription.planId': { $ne: null } } },
      { $lookup: { from: 'plans', localField: 'subscription.planId', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $group: { _id: null, total: { $sum: '$plan.price' } } },
    ]),

    // recent activity — last 10 audit logs
    AuditLog.find()
      .populate('actor.userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10),

    // subscription breakdown per plan
    User.aggregate([
      { $match: { role: { $in: [RoleType.LANDLORD, RoleType.AGENT] }, 'subscription.planId': { $ne: null } } },
      { $group: { _id: '$subscription.planId', count: { $sum: 1 } } },
      { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      { $project: { planName: '$plan.name', planTitle: '$plan.title', price: '$plan.price', billingCycle: '$plan.billingCycle', count: 1 } },
      { $sort: { count: -1 } },
    ]),

    // listings by island
    RentalProperty.aggregate([
      { $match: { 'address.island': { $ne: null, $exists: true } } },
      { $group: { _id: '$address.island', count: { $sum: 1 } } },
      { $lookup: { from: 'islands', localField: '_id', foreignField: '_id', as: 'island' } },
      { $unwind: { path: '$island', preserveNullAndEmptyArrays: true } },
      { $project: { islandName: { $ifNull: ['$island.name', 'Unknown'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),

    // accounts by island (landlords/agents operating locations)
    User.aggregate([
      { $match: { role: { $in: [RoleType.LANDLORD, RoleType.AGENT] } } },
      {
        $project: {
          locations: {
            $concatArrays: [
              { $ifNull: ['$individual.operatingLocations', []] },
              { $ifNull: ['$business.operatingLocations',  []] },
            ],
          },
        },
      },
      { $unwind: '$locations' },
      { $group: { _id: '$locations', count: { $sum: 1 } } },
      { $lookup: { from: 'islands', localField: '_id', foreignField: '_id', as: 'island' } },
      { $unwind: { path: '$island', preserveNullAndEmptyArrays: true } },
      { $project: { islandName: '$island.name', count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    summary: {
      totalAccounts,
      totalListings,
      totalPlans,
      totalLocations:              totalIslands,
      totalSecurityFlags,
      unresolvedSecurityFlags:     unresolvedFlags,
      activeSubscriptions,
      estimatedMonthlyRevenue:     estimatedRevenue[0]?.total || 0,
    },
    accounts: {
      total:     totalAccounts,
      tenants:   totalTenants,
      landlords: totalLandlords,
      agents:    totalAgents,
    },
    listings: {
      total:  totalListings,
      active: activeListings,
    },
    subscriptionBreakdown,
    listingsByIsland,
    accountsByIsland,
    recentActivity,
  };
};