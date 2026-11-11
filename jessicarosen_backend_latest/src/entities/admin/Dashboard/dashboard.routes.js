import express from 'express';
import { adminMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';
import {  getAdminDashboardSummary, getAdminOwnRevenueReport, getAdminSalesHistory, getRevenueFromSeller, getTotalRevenueReport } from './dashboard.controller.js';


const router = express.Router();
router.use(verifyToken, adminMiddleware); 


// Dashboard
router.get("/dashboard-summary", getAdminDashboardSummary);
router.get("/own-revenue-report", getAdminOwnRevenueReport);
router.get("/revenue-report", getTotalRevenueReport); 


// My Sales
router.get("/my-sales", getAdminSalesHistory); 

// Revenue from seller
router.get("/revenue-from-seller", getRevenueFromSeller);




export default router;
