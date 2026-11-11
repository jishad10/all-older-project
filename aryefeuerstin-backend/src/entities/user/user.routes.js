import { multerUpload } from '../../core/middlewares/multer.js';
import {
  getAllUsersController,
  getAllAdminsController,
  createAvatarController,
  updateAvatarProfileController,
  deleteAvatarController,
  createMultipleAvatarController,
  updateMultipleAvatarController,
  deleteMultipleAvatarController,
  createUserPDFController,
  updateUserPDFController,
  deleteUserPDFController,
  getUserProfileController,
  updateUserProfileController,
  deleteOwnAccountController,
  adminGetUserByIdController,
  adminUpdateUserController,
  adminDeleteUserController,
  getDriverRequestsController,
  approveDriverController,
  rejectDriverController,
  getAllDriversController,
  getDriverStatsController,
  getMyDriverStatsController
} from './user.controller.js';
import {
  superAdminOrAdminMiddleware,
  verifyToken
} from '../../core/middlewares/authMiddleware.js';
import express from 'express';

const router = express.Router();

// Admin dashboard
router.get('/all-users', verifyToken, superAdminOrAdminMiddleware, getAllUsersController);
router.get('/all-admins', verifyToken, superAdminOrAdminMiddleware, getAllAdminsController);
router.get(
  '/all-drivers',
  verifyToken,
  superAdminOrAdminMiddleware,
  getAllDriversController
);

// Driver management (admin)
router.get("/driver-requests", verifyToken, superAdminOrAdminMiddleware, getDriverRequestsController);
router.put("/driver/:id/approve", verifyToken, superAdminOrAdminMiddleware, approveDriverController);
router.put("/driver/:id/reject", verifyToken, superAdminOrAdminMiddleware, rejectDriverController);



// For logged-in driver to see their own stats
router.get('/driver/my-stats', verifyToken, getMyDriverStatsController);
// For admin to see any driver's stats
router.get('/driver/:id/stats', verifyToken, superAdminOrAdminMiddleware, getDriverStatsController);

// user
router.get('/me', verifyToken, getUserProfileController);
router.put(
  '/me',
  verifyToken,
  multerUpload([{ name: 'drivingLicense', maxCount: 1 }]),
  updateUserProfileController
);
router.delete('/me', verifyToken, deleteOwnAccountController);

// avatar
router.post(
  '/upload-avatar',
  verifyToken,
  multerUpload([{ name: 'profileImage', maxCount: 1 }]),
  createAvatarController
);
router.put(
  '/upload-avatar',
  verifyToken,
  multerUpload([{ name: 'profileImage', maxCount: 1 }]),
  updateAvatarProfileController
);
router.delete('/upload-avatar', verifyToken, deleteAvatarController);

// multiple avatar
router.post(
  '/upload-multiple-avatar',
  verifyToken,
  multerUpload([{ name: 'multiProfileImage', maxCount: 5 }]),
  createMultipleAvatarController
);
router.put(
  '/upload-multiple-avatar',
  verifyToken,
  multerUpload([{ name: 'multiProfileImage', maxCount: 5 }]),
  updateMultipleAvatarController
);
router.delete(
  '/upload-multiple-avatar',
  verifyToken,
  deleteMultipleAvatarController
);

// file upload
router.post(
  '/upload-file',
  verifyToken,
  multerUpload([{ name: 'userPDF', maxCount: 1 }]),
  createUserPDFController
);
router.put(
  '/upload-file',
  verifyToken,
  multerUpload([{ name: 'userPDF', maxCount: 1 }]),
  updateUserPDFController
);
router.delete('/upload-file', verifyToken, deleteUserPDFController);

// admin user management
router.get('/:id', verifyToken, superAdminOrAdminMiddleware, adminGetUserByIdController);
router.put('/:id', verifyToken, superAdminOrAdminMiddleware, adminUpdateUserController);
router.delete('/:id', verifyToken, superAdminOrAdminMiddleware, adminDeleteUserController);

export default router;

// check
