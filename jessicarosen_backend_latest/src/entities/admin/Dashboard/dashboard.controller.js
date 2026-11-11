import { generateResponse } from "../../../lib/responseFormate.js";
import {  getAdminDashboardSummaryService,  getAdminOwnRevenueReportService, getAdminSalesHistoryService, getRevenueFromSellerService, getTotalRevenueReportService } from "./dashboard.service.js";


export const getAdminDashboardSummary = async (req, res) => {
  try {
    const result = await getAdminDashboardSummaryService(req.user._id);

    generateResponse(res, 200, true, "Admin dashboard summary", result);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch admin dashboard summary", error.message);
  }
};


export const getAdminOwnRevenueReport = async (req, res) => {
  try {
    const filter = req.query.filter || "month"; 
    const data = await getAdminOwnRevenueReportService(req.user._id, filter);
    generateResponse(res, 200, true, "Admin revenue report fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch admin revenue report", error.message);
  }
};


export const getTotalRevenueReport = async (req, res) => {
  try {
    const filter = req.query.filter || "month";
    const data = await getTotalRevenueReportService(filter);
    generateResponse(res, 200, true, "Total revenue report fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch total revenue report", error.message);
  }
};


export const getAdminSalesHistory = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const { data, pagination } = await getAdminSalesHistoryService(
      req.user._id,
      search.trim(),
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: "Admin sales history fetched",
      data,
      pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin sales",
      error: error.message
    });
  }
};




export const getRevenueFromSeller = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const { data, pagination } = await getRevenueFromSellerService(
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: "Revenue from sellers fetched",
      data,
      pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue from sellers",
      error: error.message
    });
  }
};






