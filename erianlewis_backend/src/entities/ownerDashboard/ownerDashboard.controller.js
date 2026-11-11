import { generateResponse } from "../../lib/responseFormate.js";
import RoleType from "../../lib/types.js";
import { getOwnerDashboardStatsService } from "./ownerDashboard.service.js";

export const getOwnerDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return generateResponse(res, 401, false, "Unauthorized", null);
    if (![RoleType.LANDLORD, RoleType.AGENT].includes(user.role)) {
      return generateResponse(res, 403, false, "Landlord or Agent access only", null);
    }

    const data = await getOwnerDashboardStatsService(user._id);
    return generateResponse(res, 200, true, "Dashboard stats fetched", data);
  } catch (error) {
    return generateResponse(res, 500, false, error.message || "Failed to fetch dashboard stats", null);
  }
};
