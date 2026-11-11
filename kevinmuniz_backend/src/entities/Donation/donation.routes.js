import express from "express";
import {
  createDonationSessionController,
  getAllDonationsController,
  getAllRefundRequestsController,
  getBackerDonationHistoryController,
  getDonationConfirmationController,
  getMyDonationsController,
  requestRefundController,
  updateRefundStatusController,
} from "./donation.controller.js";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


router.post("/create-donation-session", verifyToken, createDonationSessionController);

router.get("/my-donations", verifyToken, getMyDonationsController);

router.get("/confirmation", verifyToken, getDonationConfirmationController);

router.post("/:donationId/request-refund", verifyToken, requestRefundController);

router.get("/backer/:userId", verifyToken, adminMiddleware, getBackerDonationHistoryController);

router.get("/all-donations", verifyToken, adminMiddleware, getAllDonationsController);

router.get("/refund-requests", verifyToken, adminMiddleware, getAllRefundRequestsController);

router.put("/:donationId/refund-status", verifyToken, adminMiddleware, updateRefundStatusController);




export default router;