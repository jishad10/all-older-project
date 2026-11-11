import { generateResponse } from "../../lib/responseFormate.js";
import {
  getRevenueSummaryService,
  getRevenueListService,
  getRevenueByIdService
} from "./revenue.service.js";

export const getRevenueSummaryController = async (req, res, next) => {
  try {
    const data = await getRevenueSummaryService();
    return generateResponse(res, 200, true, "Revenue summary", data);
  } catch (err) {
    return next(err);
  }
};

export const getRevenueListController = async (req, res, next) => {
  try {
    const data = await getRevenueListService(req.query);
    return generateResponse(res, 200, true, "Revenue list", data);
  } catch (err) {
    return next(err);
  }
};

export const getRevenueByIdController = async (req, res, next) => {
  try {
    const data = await getRevenueByIdService(req.params.id);
    if (!data) return generateResponse(res, 404, false, "Revenue not found", null);
    return generateResponse(res, 200, true, "Revenue details", data);
  } catch (err) {
    return next(err);
  }
};
