import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import returnOrderRoutes from '../../entities/returnOrder/returnOrder.routes.js';
import planRoutes from '../../entities/plan/plan.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import subscriptionRoutes from '../../entities/subscription/subscription.routes.js';
import paymentRoutes from '../../entities/payment/payment.routes.js';
import revenueRoutes from "../../entities/revenue/revenue.routes.js";
import dashboardRoutes from "../../entities/dashboard/dashboard.routes.js";
import teamRoutes from "../../entities/team/team.routes.js";
import driverWorkSessionRoutes from "../../entities/DriverWorkSession/driverWorkSession.routes.js";
import bannerRoutes from "../../entities/banner/banner.routes.js";


const router = express.Router();


router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/contact', contactRoutes);
router.use('/v1/return-order', returnOrderRoutes);
router.use('/v1/plan', planRoutes);
router.use('/v1/subscription', subscriptionRoutes);
router.use('/v1/payment', paymentRoutes);
router.use("/v1/revenue", revenueRoutes);
router.use("/v1/dashboard", dashboardRoutes);
router.use("/v1/team", teamRoutes);
router.use("/v1/driver-work-session", driverWorkSessionRoutes);
router.use("/v1/banner", bannerRoutes);


export default router;
