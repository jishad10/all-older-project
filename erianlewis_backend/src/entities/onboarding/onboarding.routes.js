import express from 'express';
import {
  getOnboarding,
  updateStepContent,
  toggleStep
} from './onboarding.controller.js';

import { adminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';


const router = express.Router();

// Public — frontend uses this to render multi-step form
// ?role=USER | LANDLORD | AGENT → returns filtered steps for that role
router.get('/', getOnboarding);

// Admin only
router.put('/steps/:stepKey/content', verifyToken, adminMiddleware, updateStepContent);
router.put('/steps/:stepKey/toggle', verifyToken, adminMiddleware, toggleStep);

export default router;
















// import express from 'express';
// import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
// import {
//   getOnboarding,
//   updateStepConfig,
//   updateStepContent,
//   updatePreviewRole,
//   resetOnboarding,
// } from './onboarding.controller.js';

// const router = express.Router();

// // Public — frontend reads this during registration
// router.get('/', getOnboarding);

// // Admin only
// router.put('/steps/:stepKey/config',   verifyToken, adminMiddleware, updateStepConfig);
// router.put('/preview-role', verifyToken, adminMiddleware, updatePreviewRole);
// router.put('/steps/:stepKey/content',  verifyToken, adminMiddleware, updateStepContent);
// router.post('/reset',                  verifyToken, adminMiddleware, resetOnboarding);

// export default router;