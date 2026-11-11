import express from "express";
import {
  createRentalPropertyController,
  deleteRentalPropertyController,
  getAllRentalPropertiesController,
  getRentalPropertyByIdController,
  updateRentalPropertyController,
  adminGetAllListingsController,
  disableListingController,
  enableListingController,
  adminDeleteListingController,
  bulkDisableListingsController,
  bulkEnableListingsController,
  bulkDeleteListingsController,
  getRentalPropertiesForMapController,
} from "./rentalProperty.controller.js";
import { upload } from "../../core/middlewares/multer.js";
import { verifyToken, adminMiddleware, optionalAuth } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Admin — listings table with filters
router.get   ("/admin/all",         verifyToken, adminMiddleware, adminGetAllListingsController);
router.put   ("/admin/bulk/disable",   verifyToken, adminMiddleware, bulkDisableListingsController);
router.put   ("/admin/bulk/enable",    verifyToken, adminMiddleware, bulkEnableListingsController);
router.delete("/admin/bulk/delete",    verifyToken, adminMiddleware, bulkDeleteListingsController);
router.put   ("/admin/:id/disable",    verifyToken, adminMiddleware, disableListingController);
router.put   ("/admin/:id/enable",     verifyToken, adminMiddleware, enableListingController);
router.delete("/admin/:id",            verifyToken, adminMiddleware, adminDeleteListingController);

// Public — optionalAuth for role-based filtering (guest/user=all, landlord/agent=own only)
router.get("/",    optionalAuth, getAllRentalPropertiesController);

router.get("/map-pins", optionalAuth, getRentalPropertiesForMapController);

router.get("/:id", optionalAuth, getRentalPropertyByIdController);

// Owner — create, update, delete own listings
router.post(  "/",    verifyToken, upload.array("photos", 10), createRentalPropertyController);
router.put(   "/:id", verifyToken, upload.array("photos", 10), updateRentalPropertyController);
router.delete("/:id", verifyToken,                             deleteRentalPropertyController);

export default router;