import { generateResponse } from "../../lib/responseFormate.js";
import {
  punchInService,
  punchOutService,
  getDriverWorkingHours
} from "./driverWorkSession.service.js";

export const punchIn = async (req, res) => {
  try {
    const session = await punchInService(req.user._id);

    return generateResponse(res, 201, true, "Work session started", session);
  } catch (error) {
    return generateResponse(res, 400, false, error.message, null);
  }
};

export const punchOut = async (req, res) => {
  try {
    const session = await punchOutService(req.user._id);

    return generateResponse(res, 200, true, "Work session completed", session);
  } catch (error) {
    return generateResponse(res, 400, false, error.message, null);
  }
};

// NEW: Get all drivers working hours (Admin only)
export const getAllDriverWorkingHours = async (req, res) => {
  try {
    const { page, limit, search, startDate, endDate } = req.query;

    const result = await getDriverWorkingHours({
      page,
      limit,
      search,
      startDate,
      endDate
    });

    return generateResponse(
      res,
      200,
      true,
      "Driver working hours fetched successfully",
      result
    );
  } catch (error) {
    return generateResponse(
      res,
      500,
      false,
      "Failed to fetch working hours",
      error.message
    );
  }
};