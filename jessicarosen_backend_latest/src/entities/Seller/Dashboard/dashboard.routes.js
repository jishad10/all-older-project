import express from 'express';
import { sellerMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';
import {  getSellerDashboardSummary, getSellerRevenueReport, getSellerSalesHistory } from './dashboard.controller.js';


const router = express.Router();
router.use(verifyToken, sellerMiddleware); 


router.get("/dashboard-summary", getSellerDashboardSummary);
router.get("/revenue-report", getSellerRevenueReport);


// My Sales
router.get("/my-sales", getSellerSalesHistory); 

export default router;
