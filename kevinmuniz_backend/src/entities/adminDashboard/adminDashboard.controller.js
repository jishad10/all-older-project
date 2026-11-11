import { generateResponse } from "../../lib/responseFormate.js";
import {
  getCampaignWiseRaisedService,
  getDashboardOverviewService,
  getDonationReportService,
  getUsersByRoleWithCampaignsService,
  getUserWiseRaisedService,
  toggleUserSuspensionService,
} from "./adminDashboard.service.js";

export const getDashboardOverviewController = async (req, res, next) => {
  try {
    const data = await getDashboardOverviewService();

    return generateResponse(
      res,
      200,
      true,
      "Dashboard overview fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

export const getDonationReportController = async (req, res, next) => {
  try {
    const { year } = req.query;

    const data = await getDonationReportService({ year });

    return generateResponse(
      res,
      200,
      true,
      "Donation report fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

export const getUsersByRoleWithCampaignsController = async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;

    const data = await getUsersByRoleWithCampaignsService({
      page,
      limit,
      search,
      role,
    });

    return generateResponse(res, 200, true, "Users fetched successfully", data);
  } catch (error) {
    next(error);
  }
};



export const getCampaignWiseRaised = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);

    const data = await getCampaignWiseRaisedService({ page, limit });

    generateResponse(res, 200, true, "Campaign-wise raised amount fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, error.message);
  }
};


export const getUserWiseRaised = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);

    const data = await getUserWiseRaisedService({ page, limit });

    generateResponse(res, 200, true, "User-wise raised amount fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, error.message);
  }
};


export const toggleUserSuspension = async (req, res, next) => {
  try {
    const data = await toggleUserSuspensionService(req.params.userId);
    generateResponse(res, 200, true, 'User suspension status updated', data);
  } catch (error) {
    if (error.message === 'User not found') {
      generateResponse(res, 404, false, 'User not found', null);
    } else {
      next(error);
    }
  }
};