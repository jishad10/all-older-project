import { generateResponse } from "../../lib/responseFormate.js";
import {
  createReturnOrderService,
  getMyReturnOrdersService,
  getMyReturnOrderByIdService,
  updateMyReturnOrderService,
  addReviewToReturnOrderService,
  getAllReviewsService,
  driverUpdateReturnOrderStatusService,
  adminGetPickupHistoryService,
  adminGetPickupByIdService,
  getPendingReturnOrdersAdminService,
  assignDriverToReturnOrdersService,
  getMyAssignedReturnOrdersService,
  getMyCompletedReturnOrdersService,
  getReturnOrderDetailsService,
  generateDriverRouteService,
  adminGetAllReturnOrdersService,
  adminGetReturnOrderByIdService,
  adminDeleteReturnOrderService
} from "./returnOrder.service.js";


export const createReturnOrder = async (req, res) => {
  try {
     
    const userId = req.user._id;
    const files = req.files || {};

    const result = await createReturnOrderService({
      userId,
      body: req.body,
      files
    });

    return generateResponse(
      res,
      201,
      true,
      'Return order created successfully',
      result
    );
  } catch (error) {
    console.error('Create return order error:', error);
    return generateResponse(
      res,
      500,
      false,
      error.message || 'Failed to create return order',
      null
    );
  }
};


export const getMyReturnOrders = async (req, res, next) => {
  try {
    const result = await getMyReturnOrdersService(req.user._id, req.query);
    return generateResponse(res, 200, true, "My return orders", result);
  } catch (err) {
    return next(err);
  }
};


export const getMyReturnOrderById = async (req, res, next) => {
  try {
    const order = await getMyReturnOrderByIdService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, "Return order", order);
  } catch (err) {
    if (err.message === "Order not found") {
      return generateResponse(res, 404, false, err.message, null);
    }
    return next(err);
  }
};


export const getReturnOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await getReturnOrderDetailsService(id);

    return generateResponse(
      res,
      200,
      true,
      "Return order details",
      order
    );
  } catch (error) {
    if (error.message === "Return order not found") {
      return generateResponse(res, 404, false, error.message, null);
    }

    return generateResponse(
      res,
      500,
      false,
      "Internal server error",
      error.message
    );
  }
};


export const updateMyReturnOrder = async (req, res, next) => {
  try {
    const order = await updateMyReturnOrderService(
      req.user._id,
      req.params.id,
      req.body,
      req.files
    );

    const message =
      req.body?.status === "CANCELLED"
        ? "Return order cancelled"
        : "Return order updated";

    return generateResponse(res, 200, true, message, order);
  } catch (err) {
    const msg = err.message;

    if (msg === "Order not found") {
      return generateResponse(res, 404, false, msg, null);
    }
    if (
      msg === "Order can't be updated now" ||
      msg === "Order can't be cancelled" ||
      msg === "Invalid packages format" ||
      msg === "Packages count mismatch" ||
      msg === "creditCardLast4 is required" ||
      msg === "pickupAndReturnAddress is required" ||
      msg === "Product dimensions and weight are required"
    ) {
      return generateResponse(res, 403, false, msg, null);
    }

    return next(err);
  }
};


export const driverUpdateReturnOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await driverUpdateReturnOrderStatusService(
      req.user._id,
      req.params.id,
      status
    );

    return generateResponse(res, 200, true, "Order status updated", order);
  } catch (err) {
    const msg = err.message;

    if (
      msg === "Status is required" ||
      msg === "Invalid status" ||
      msg === "Invalid status flow" ||
      msg === "You are not assigned to this order"
    ) {
      return generateResponse(res, 400, false, msg, null);
    }

    if (msg === "Order not found") {
      return generateResponse(res, 404, false, msg, null);
    }

    if (msg === "Order can't be updated now") {
      return generateResponse(res, 403, false, msg, null);
    }

    return next(err);
  }
};


export const addReviewToMyReturnOrder = async (req, res, next) => {
  try {
    const order = await addReviewToReturnOrderService(req.user._id, req.params.id, req.body);
    return generateResponse(res, 200, true, "Review submitted", order);
  } catch (err) {
    const msg = err.message;

    if (
      msg === "Rating is required" ||
      msg === "Rating must be 1 to 5" ||
      msg === "You can review only after delivery completed" ||
      msg === "Review already submitted"
    ) {
      return generateResponse(res, 400, false, msg, null);
    }

    if (msg === "Order not found") {
      return generateResponse(res, 404, false, msg, null);
    }

    return next(err);
  }
};


export const getAllReviews = async (req, res, next) => {
  try {
    const result = await getAllReviewsService(req.query);
    return generateResponse(res, 200, true, "All reviews", result);
  } catch (err) {
    return next(err);
  }
};


export const adminGetPickupHistory = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (id) {
      const order = await adminGetPickupByIdService(id);
      return generateResponse(res, 200, true, "Pickup details", order);
    }

    const result = await adminGetPickupHistoryService(req.query);
    return generateResponse(res, 200, true, "Pickup history", result);
  } catch (err) {
    if (err.message === "Pickup not found" || err.message === "Order not found") {
      return generateResponse(res, 404, false, err.message, null);
    }
    return next(err);
  }
};


export const getPendingReturnOrdersAdmin = async (req, res) => {
  try {
    const {
      zipCode,
      street,
      city,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const result = await getPendingReturnOrdersAdminService({
      zipCode,
      street,
      city,
      search,
      page: Number(page),
      limit: Number(limit)
    });

    return generateResponse(
      res,
      200,
      true,
      "Pending return orders fetched successfully",
      result
    );
  } catch (error) {
    console.error("Admin pending return orders error:", error);
    return generateResponse(
      res,
      500,
      false,
      "Failed to fetch pending return orders",
      null
    );
  }
};


export const generateDriverRoute = async (req, res, next) => {
  try {
    const { orderIds, currentLocation } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return generateResponse(
        res,
        400,
        false,
        "orderIds are required",
        null
      );
    }

    const data = await generateDriverRouteService({
      driverId: req.user._id,
      orderIds,
      currentLocation
    });

    return generateResponse(
      res,
      200,
      true,
      "Route generated successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};


// export const generateRoute = async (req, res, next) => {
//   try {
//     const { driverId } = req.body;

//     if (!driverId) {
//       return generateResponse(
//         res,
//         400,
//         false,
//         "Driver ID is required",
//         null
//       );
//     }

//     const data = await generateRouteService(driverId);

//     return generateResponse(
//       res,
//       200,
//       true,
//       "Optimized route generated successfully",
//       data
//     );
//   } catch (error) {
//     next(error);
//   }
// };


export const assignDriverToReturnOrders = async (req, res) => {
  try {
    const { driverId, orderIds } = req.body;

    if (!driverId || !Array.isArray(orderIds) || orderIds.length === 0) {
      return generateResponse(
        res,
        400,
        false,
        'driverId and orderIds are required',
        null
      );
    }

    const result = await assignDriverToReturnOrdersService(
      driverId,
      orderIds,
      req.user._id
    );

    return generateResponse(
      res,
      200,
      true,
      'Driver assigned to return orders successfully',
      result
    );
  } catch (error) {
    return generateResponse(
      res,
      error.statusCode || 500,
      false,
      error.message || 'Failed to assign driver',
      null
    );
  }
};


export const getMyAssignedReturnOrders = async (req, res, next) => {
  try {
    const driverId = req.user._id;

    const data = await getMyAssignedReturnOrdersService(driverId);

    return generateResponse(
      res,
      200,
      true,
      "Assigned return orders fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};


export const getMyCompletedReturnOrders = async (req, res, next) => {
  try {
    const driverId = req.user._id;
    const result = await getMyCompletedReturnOrdersService(driverId, req.query);
    
    return generateResponse(
      res,
      200,
      true,
      "Completed return orders fetched successfully",
      result
    );
  } catch (error) {
    return next(error);
  }
};





export const adminGetAllReturnOrders = async (req, res, next) => {
  try {
    const result = await adminGetAllReturnOrdersService(req.query);
    return generateResponse(res, 200, true, "Return orders fetched", result);
  } catch (err) {
    return next(err);
  }
};

export const adminGetReturnOrderById = async (req, res, next) => {
  try {
    const order = await adminGetReturnOrderByIdService(req.params.id);
    return generateResponse(res, 200, true, "Return order", order);
  } catch (err) {
    if (err.message === "Order not found") {
      return generateResponse(res, 404, false, err.message, null);
    }
    return next(err);
  }
};

export const adminDeleteReturnOrder = async (req, res, next) => {
  try {
    await adminDeleteReturnOrderService(req.params.id);
    return generateResponse(res, 200, true, "Return order deleted", null);
  } catch (err) {
    if (err.message === "Order not found") {
      return generateResponse(res, 404, false, err.message, null);
    }
    return next(err);
  }
};
