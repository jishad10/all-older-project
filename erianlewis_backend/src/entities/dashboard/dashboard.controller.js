import { generateResponse } from '../../lib/responseFormate.js';
import { recordSiteVisitService, getSiteStatsService, getAdminStatsService } from './dashboard.service.js';

// Public — frontend calls on every site load to count visits
export const recordSiteVisit = async (req, res, next) => {
  try {
    await recordSiteVisitService();
    return generateResponse(res, 200, true, 'Visit recorded', null);
  } catch (error) { next(error); }
};

// Public — landing page stats
export const getSiteStats = async (req, res, next) => {
  try {
    const data = await getSiteStatsService();
    return generateResponse(res, 200, true, 'Site stats fetched', data);
  } catch (error) { next(error); }
};

// Admin — full dashboard stats
export const getAdminStats = async (req, res, next) => {
  try {
    const data = await getAdminStatsService();
    return generateResponse(res, 200, true, 'Admin stats fetched', data);
  } catch (error) { next(error); }
};