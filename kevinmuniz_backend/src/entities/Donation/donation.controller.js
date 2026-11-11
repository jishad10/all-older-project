import { generateResponse } from "../../lib/responseFormate.js";
import {
  createDonationSessionService,
  getAllDonationsService,
  getBackerDonationHistoryService,
  getMyDonationsService,
  requestRefundService,
  getAllRefundRequestsService,
  updateRefundStatusService,
  getDonationConfirmationService,
} from "./donation.service.js";


export const createDonationSessionController = async (req, res, next) => {
  try {
    const { campaignId, amount } = req.body;
    const donorId = req.user._id;

    const data = await createDonationSessionService({ campaignId, amount, donorId });

    return generateResponse(res, 200, true, "Stripe session created", data);
  } catch (error) {
    next(error);
  }
};


export const getAllDonationsController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const data = await getAllDonationsService({ page, limit });

    return generateResponse(res, 200, true, "Donations fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getDonationConfirmationController = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    const donorId = req.user._id;

    if (!session_id) {
      return generateResponse(res, 400, false, "session_id is required", null);
    }

    const data = await getDonationConfirmationService({ sessionId: session_id, donorId });
    return generateResponse(res, 200, true, "Donation confirmation fetched", data);
  } catch (error) {
    next(error);
  }
};


export const getMyDonationsController = async (req, res, next) => {
  try {
    const donorId = req.user._id;
    const { page, limit } = req.query;

    const data = await getMyDonationsService({ donorId, page, limit });

    return generateResponse(res, 200, true, "Your donations fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getBackerDonationHistoryController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit, campaignId } = req.query;

    const data = await getBackerDonationHistoryService({ userId, campaignId, page, limit });

    return generateResponse(res, 200, true, "Backer donation history fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const requestRefundController = async (req, res, next) => {
  try {
    const { donationId } = req.params;
    const { reason } = req.body;
    const donorId = req.user._id;

    const data = await requestRefundService({ donationId, donorId, reason });

    return generateResponse(res, 200, true, "Refund request submitted successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getAllRefundRequestsController = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;

    const data = await getAllRefundRequestsService({ page, limit, status });

    return generateResponse(res, 200, true, "Refund requests fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const updateRefundStatusController = async (req, res, next) => {
  try {
    const { donationId } = req.params;
    const { status } = req.body;

    const data = await updateRefundStatusService({ donationId, status });

    return generateResponse(res, 200, true, "Refund status updated successfully", data);
  } catch (error) {
    next(error);
  }
};