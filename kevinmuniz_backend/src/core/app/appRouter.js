import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import categoryRoutes from '../../entities/category/category.routes.js';
import campaignRoutes from '../../entities/campaign/campaign.routes.js';
import donationRoutes from '../../entities/Donation/donation.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import representationRoutes from '../../entities/representation/representation.routes.js';
import dashboardRoutes from '../../entities/adminDashboard/adminDashboard.routes.js';
import campaignAnalyticsRoutes from '../../entities/campaignAnalytics/campaignAnalytics.routes.js';
import notificationRoutes from '../../entities/notification/notification.routes.js';
import cmsRoutes from '../../entities/cms/cms.routes.js';


const router = express.Router();


router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/category', categoryRoutes);
router.use('/v1/campaign', campaignRoutes);
router.use('/v1/donation', donationRoutes);
router.use('/v1/contact', contactRoutes);
router.use('/v1/representation', representationRoutes);
router.use('/v1/admin/dashboard', dashboardRoutes);
router.use('/v1/campaign-analytics', campaignAnalyticsRoutes);
router.use('/v1/notification', notificationRoutes);
router.use('/v1/cms', cmsRoutes);


export default router;
