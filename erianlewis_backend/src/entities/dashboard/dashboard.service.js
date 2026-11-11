import User from '../auth/auth.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import Category from '../category/category.model.js';
import SiteStats from './dashboard.model.js';
import RoleType from '../../lib/types.js';


// Called every time someone visits the site — frontend calls this on load
export const recordSiteVisitService = async () => {
  await SiteStats.findOneAndUpdate(
    { singleton: true },
    { $inc: { totalVisits: 1 } },
    { upsert: true, new: true }
  );
};


// Public stats for landing page
export const getSiteStatsService = async () => {
  const [siteStats, totalUsers, totalListings, categories] = await Promise.all([
    SiteStats.findOne({ singleton: true }),
    User.countDocuments({ role: { $in: [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT] } }),
    RentalProperty.countDocuments({ status: 'active' }),
    Category.find({ status: 'active' }).sort({ name: 1 }).select('name status'),
  ]);

  return {
    totalSiteVisits: siteStats?.totalVisits || 0,
    totalUsers,
    totalListings,
    categories, // landing page can read from here
  };
};


// Admin dashboard stats
export const getAdminStatsService = async () => {
  const [
    totalTenants,
    totalLandlords,
    totalAgents,
    totalListings,
    totalRentListings,
    totalBuyListings,
    recentUsers,
    recentListings,
    siteStats,
  ] = await Promise.all([
    User.countDocuments({ role: RoleType.USER }),
    User.countDocuments({ role: RoleType.LANDLORD }),
    User.countDocuments({ role: RoleType.AGENT }),
    RentalProperty.countDocuments(),
    RentalProperty.countDocuments({ listingType: 'rent' }),
    RentalProperty.countDocuments({ listingType: 'buy' }),
    User.find({ role: { $in: [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT] } })
      .select('firstName lastName email role accountStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(5),
    RentalProperty.find()
      .populate('address.island', 'name')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(5),
    SiteStats.findOne({ singleton: true }),
  ]);

  return {
    totalSiteVisits: siteStats?.totalVisits || 0,
    users: {
      total:     totalTenants + totalLandlords + totalAgents,
      tenants:   totalTenants,
      landlords: totalLandlords,
      agents:    totalAgents,
    },
    listings: {
      total: totalListings,
      rent:  totalRentListings,
      buy:   totalBuyListings,
    },
    recent: {
      users:    recentUsers,
      listings: recentListings,
    },
  };
};
