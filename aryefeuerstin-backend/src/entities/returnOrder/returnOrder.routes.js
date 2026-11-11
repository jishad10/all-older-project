import express from "express";
import { verifyToken, userMiddleware, driverMiddleware, superAdminOrAdminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";
import {
  createReturnOrder,
  getMyReturnOrders,
  getMyReturnOrderById,
  updateMyReturnOrder,
  addReviewToMyReturnOrder ,
  driverUpdateReturnOrderStatus,
  getAllReviews,
  adminGetPickupHistory, 
  getPendingReturnOrdersAdmin,
  assignDriverToReturnOrders,
  getMyAssignedReturnOrders,
  getMyCompletedReturnOrders,
  getReturnOrderDetails,
  generateDriverRoute,
  adminGetAllReturnOrders,
  adminGetReturnOrderById,
  adminDeleteReturnOrder

} from "./returnOrder.controller.js";

const router = express.Router();

// up to 10 packages, up to 6 images each (one request)
const barcodeFields = Array.from({ length: 10 }).map((_, i) => ({
  name: `barcode_${i}`,
  maxCount: 6,
}));

router.get("/reviews", getAllReviews);
router.get("/admin/pickup-history", verifyToken, superAdminOrAdminMiddleware, adminGetPickupHistory);

router.post(
  "/generate",
  verifyToken, 
  generateDriverRoute
);

router.get(
  "/admin/orders-request",
  verifyToken,
  superAdminOrAdminMiddleware,
  getPendingReturnOrdersAdmin
);

router.put(
  '/assign-driver',
  verifyToken,
  superAdminOrAdminMiddleware,
  assignDriverToReturnOrders
);

router.get(
  "/my-assignments",
  verifyToken,
  driverMiddleware,
  getMyAssignedReturnOrders
);


// ✅ Driver routes - completed orders
router.get(
  "/my-completed",
  verifyToken,
  driverMiddleware,
  getMyCompletedReturnOrders
);

// CREATE
router.post(
  '/',
  verifyToken,
  multerUpload([{ name: 'barcodeImages', maxCount: 20 }, { name: 'physicalReturnLabelFiles', maxCount: 5 }]),
  createReturnOrder
);

// Admin: full list (no status filter)
router.get(
  "/admin/return-orders",
  verifyToken,
  superAdminOrAdminMiddleware,
  adminGetAllReturnOrders
);

// Admin: single by id
router.get(
  "/admin/return-orders/:id",
  verifyToken,
  superAdminOrAdminMiddleware,
  adminGetReturnOrderById
);

// Admin: delete by id
router.delete(
  "/admin/return-orders/:id",
  verifyToken,
  superAdminOrAdminMiddleware,
  adminDeleteReturnOrder
);


// LIST + DETAILS
router.get("/", verifyToken, userMiddleware, getMyReturnOrders);

router.get("/:id", verifyToken, getMyReturnOrderById);


router.get("/see-details/:id", getReturnOrderDetails);


// UPDATE: accept multipart + files too (while pending)
router.put("/:id", verifyToken, userMiddleware, multerUpload(barcodeFields), updateMyReturnOrder);

// DRIVER: update order status
router.put(
  "/:id/driver-status",
  verifyToken,
  driverMiddleware,
  driverUpdateReturnOrderStatus
);

// USER review (only after completed)
router.post("/:id/review", verifyToken, userMiddleware, addReviewToMyReturnOrder);
router.get("/reviews", getAllReviews);




export default router;
