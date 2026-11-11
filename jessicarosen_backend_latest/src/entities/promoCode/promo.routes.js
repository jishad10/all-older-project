import express from "express";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { applyPromoCode, createPromoCode, deletePromoCode, getAllPromoCodes, getPromoCodeById, updatePromoCode } from "./promo.controller.js";


const router = express.Router();

// Public
router.get("/", getAllPromoCodes);
router.get("/:id", getPromoCodeById);
router.post("/apply", applyPromoCode); 

// Admin only
router.post("/", verifyToken, adminMiddleware, createPromoCode);
router.put("/:id", verifyToken, adminMiddleware, updatePromoCode);
router.delete("/:id", verifyToken, adminMiddleware, deletePromoCode);


export default router;
