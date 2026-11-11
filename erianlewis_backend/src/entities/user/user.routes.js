import express from "express";
import { multerUpload } from "../../core/middlewares/multer.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import {
  getAllUsersController,
  getAllAdminsController,
  getAllLandlordsController,
  getAllAgentsController,
  getAllAccountsController,
  suspendUserController,
  unsuspendUserController,
  getUserProfileController,
  updateUserProfileController,
  deleteOwnAccountController,
  createAvatarController,
  updateAvatarProfileController,
  deleteAvatarController,
  createMultipleAvatarController,
  updateMultipleAvatarController,
  deleteMultipleAvatarController,
  createUserPDFController,
  updateUserPDFController,
  deleteUserPDFController,
  adminGetUserByIdController,
  adminUpdateUserController,
  adminDeleteUserController,
} from "./user.controller.js";

const router = express.Router();

// Admin — accounts table (all roles with filters)
router.get("/all-accounts", verifyToken, adminMiddleware, getAllAccountsController);

// Admin — list by role
router.get("/all-users",     verifyToken, adminMiddleware, getAllUsersController);
router.get("/all-admins",    verifyToken, adminMiddleware, getAllAdminsController);
router.get("/all-landlords", verifyToken, adminMiddleware, getAllLandlordsController);
router.get("/all-agents",    verifyToken, adminMiddleware, getAllAgentsController);

// Admin — suspend / unsuspend
router.put("/:id/suspend",   verifyToken, adminMiddleware, suspendUserController);
router.put("/:id/unsuspend", verifyToken, adminMiddleware, unsuspendUserController);

// User — own profile
router.get("/me",    verifyToken, getUserProfileController);
router.put("/me",    verifyToken, updateUserProfileController);
router.delete("/me", verifyToken, deleteOwnAccountController);

// Avatar — single
router.post(  "/upload-avatar", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), createAvatarController);
router.put(   "/upload-avatar", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), updateAvatarProfileController);
router.delete("/upload-avatar", verifyToken, deleteAvatarController);

// Avatar — multiple
router.post(  "/upload-multiple-avatar", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 }]), createMultipleAvatarController);
router.put(   "/upload-multiple-avatar", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 }]), updateMultipleAvatarController);
router.delete("/upload-multiple-avatar", verifyToken, deleteMultipleAvatarController);

// PDF
router.post(  "/upload-file", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 }]), createUserPDFController);
router.put(   "/upload-file", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 }]), updateUserPDFController);
router.delete("/upload-file", verifyToken, deleteUserPDFController);

// Admin — manage any user by ID (keep at bottom to avoid conflict with named routes)
router.get(   "/:id", verifyToken, adminMiddleware, adminGetUserByIdController);
router.put(   "/:id", verifyToken, adminMiddleware, adminUpdateUserController);
router.delete("/:id", verifyToken, adminMiddleware, adminDeleteUserController);

export default router;