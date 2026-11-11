import express from 'express';
import cmsRoutes from './CMS/cms.routes.js';
import serviceRoutes from './Services/createServices.routes.js'
import dashboardRoutes from './dashboard/dashboard.routes.js';


const router = express.Router();

router.use('/cms', cmsRoutes);
router.use('/services', serviceRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
