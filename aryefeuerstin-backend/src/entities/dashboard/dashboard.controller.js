// src/entities/dashboard/dashboard.controller.js
import { generateResponse } from "../../lib/responseFormate.js";
import { getDashboardGrowthService, getDashboardTotalsService,getDashboardReturnOrdersService } from "./dashboard.service.js";

export const getDashboardTotalsController = async (req, res, next) => {
  try {
    const data = await getDashboardTotalsService();
    return generateResponse(res, 200, true, "Dashboard totals fetched", data);
  } catch (err) {
    return next(err);
  }
};

// Controller to get dashboard growth data

export const getDashboardGrowthController = async (req, res, next) => {
  try {
    const { year } = req.query;
    const data = await getDashboardGrowthService({ year });
    return generateResponse(res, 200, true, "Dashboard growth fetched", data);
  } catch (err) {
    return next(err);
  }
};

export const getDashboardReturnOrdersController = async (req, res, next) => {
  try {
    const { page, limit, status, search, zipCode, street, city } = req.query;

    const data = await getDashboardReturnOrdersService({
      page,
      limit,
      status,
      search,
      zipCode,
      street,
      city
    });

    return generateResponse(res, 200, true, "Return orders fetched", data);
  } catch (err) {
    return next(err);
  }
};


