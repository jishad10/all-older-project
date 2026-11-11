import express from "express";
import { verifyToken } from "../../core/middlewares/authMiddleware.js";
import { createSubscriptionCheckout } from "./subscription.controller.js";

const router = express.Router();

router.post("/buy/:planId", verifyToken, createSubscriptionCheckout);

export default router;
