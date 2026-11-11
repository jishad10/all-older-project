import { generateResponse } from "../../lib/responseFormate.js";
import {
  getCampaignDashboardService,
  getCreatorDashboardStatsService,
  getCreatorDashboardOverviewService,
} from "./campaignAnalytics.service.js";


export const getCampaignDashboardController = async (req, res, next) => {
  try {
    const { year } = req.query;
    const data = await getCampaignDashboardService({ year });
    return generateResponse(res, 200, true, "Campaign dashboard fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getCreatorDashboardStatsController = async (req, res, next) => {
  try {
    const data = await getCreatorDashboardStatsService({ creatorId: req.user._id });
    return generateResponse(res, 200, true, "Creator stats fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getCreatorDashboardOverviewController = async (req, res, next) => {
  try {
    const data = await getCreatorDashboardOverviewService({ creatorId: req.user._id });
    return generateResponse(res, 200, true, "Creator overview fetched successfully", data);
  } catch (error) {
    next(error);
  }
};