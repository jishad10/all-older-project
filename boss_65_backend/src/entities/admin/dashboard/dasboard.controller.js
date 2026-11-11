import { generateResponse } from "../../../lib/responseFormate.js";
import { getDashboardData } from "./dashboard.service.js";

export const dashboard = async(req,res)=>{
    try {
        const { startDate, endDate } = req.query;
        const dashboardData = await getDashboardData(startDate, endDate);
        generateResponse(res, 200, true, "Dashboard data fetched successfully", dashboardData);
    } catch (error) {
        generateResponse(res, 500, false, "Failed to fetch dashboard data", error.message);
    }
}