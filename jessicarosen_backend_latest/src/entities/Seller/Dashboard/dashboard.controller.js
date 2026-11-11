import { generateResponse } from "../../../lib/responseFormate.js";
import {  getSellerDashboardSummaryService, getSellerRevenueReportService, getSellerSalesHistoryService } from "./dashboard.service.js";


export const getSellerDashboardSummary = async (req, res) => {
  try {
    const result = await getSellerDashboardSummaryService(req.user._id);
    generateResponse(res, 200, true, "Seller dashboard summary", result);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch seller dashboard summary", error.message);
  }
};


export const getSellerRevenueReport = async (req, res) => {
  try {
    const filter = req.query.filter || "month"; 
    const data = await getSellerRevenueReportService(req.user._id, filter);
    generateResponse(res, 200, true, "Revenue report fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, error.message);
  }
};


export const getSellerSalesHistory = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const { data, pagination } = await getSellerSalesHistoryService(
      req.user._id,
      search.trim(),
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: "Seller sales history fetched",
      data,
      pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
      error: error.message
    });
  }
};





