import ReturnOrder, { FEES, RETURN_STORES } from "./returnOrder.model.js";
import User from "../auth/auth.model.js";
import mongoose from "mongoose";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import axios from "axios";
import RoleType from "../../lib/types.js";
import sendEmail from "../../lib/sendEmail.js";
import { returnOrderCreatedTemplate,returnOrderStatusUpdateTemplate  } from "../../lib/returnOrderEmail.js";

// helpers
const toBool = v => v === true || v === 'true' || v === 1 || v === '1';
const toNum = v => Number.isFinite(Number(v)) ? Number(v) : null;


const normalizeStore = (name) => {
  if (!name) return name;
  const normalized = String(name).toUpperCase().trim();
  const match = RETURN_STORES.find(s => s === normalized);
  return match || name;
};


// export const createReturnOrderService = async ({ userId, body, files }) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     /**
//      * STORES (JSON – required)
//      */
//     if (!body.stores) {
//       throw new Error('Stores is required');
//     }

//     const parsedStores = JSON.parse(body.stores);

//     /**
//      * CUSTOMER (build from form-data)
//      */
//     const parsedCustomer = {
//       firstName: body.firstName,
//       lastName: body.lastName,
//       phone: body.phone,
//       email: body.email,

//       address: {
//         zipCode: body.zipCode || '',
//         street: body.street || '',
//         city: body.city || ''
//       },

//       pickupInstructions: body.pickupInstructions || '',

//       pickupLocation: {
//         address: body.address,
//         lat: Number(body.lat),
//         lng: Number(body.lng),
//         location: {
//           type: 'Point',
//           coordinates: [Number(body.lng), Number(body.lat)]
//         }
//       }
//     };

//     /**
//      * OPTIONS (build from form-data)
//      */
//     const parsedOptions = {
//       rushService: {
//         enabled: body.rushService === 'true'
//       },

//       physicalReturnLabel: {
//         enabled: body.physicalReturnLabel === 'true'
//       },

//       physicalReceipt: {
//         enabled: body.physicalReceipt === 'true',
//         creditCardLast4: body.creditCardLast4 || ''
//       },

//       returnShippingLabel: {
//         enabled: body.returnShippingLabel === 'true',
//         pickupAndReturnAddress: body.pickupAndReturnAddress || '',
//         dimensions: {
//           length: Number(body.productLength) || 0,
//           width: Number(body.productWidth) || 0,
//           height: Number(body.productHeight) || 0,
//           weight: Number(body.productWeight) || 0
//         }
//       },

//       message: {
//         enabled: body.leaveMessage === 'true',
//         note: body.messageNote || ''
//       }
//     };

//     /**
//      * Upload barcode images (if any)
//      */
//     if (files?.barcodeImages?.length) {
//       let imageIndex = 0;

//       for (const store of parsedStores) {
//         for (const pkg of store.packages) {
//           if (!pkg.barcodeImages) pkg.barcodeImages = [];

//           if (files.barcodeImages[imageIndex]) {
//             const upload = await cloudinaryUpload(
//               files.barcodeImages[imageIndex].path,
//               `barcode_${Date.now()}_${imageIndex}`,
//               'return-orders/barcodes'
//             );

//             if (upload?.secure_url) {
//               pkg.barcodeImages.push(upload.secure_url);
//             }

//             imageIndex++;
//           }
//         }
//       }
//     }

//     /**
//      * PRICING
//      */
//     let extraFees = 0;

//     if (parsedOptions.rushService.enabled) {
//       extraFees += FEES.RUSH_SERVICE;
//     }

//     if (parsedOptions.physicalReturnLabel.enabled) {
//       extraFees += FEES.PHYSICAL_RETURN_LABEL;
//     }

//     if (parsedOptions.physicalReceipt.enabled) {
//       extraFees += FEES.PHYSICAL_RECEIPT;
//     }

//     if (parsedOptions.returnShippingLabel.enabled) {
//       extraFees += FEES.RETURN_SHIPPING_LABEL;
//     }

//     const baseAmount = 0;
//     const totalAmount = baseAmount + extraFees;

//     /**
//      * CREATE ORDER
//      */
//     const returnOrder = await ReturnOrder.create(
//       [
//         {
//           user: userId,
//           customer: parsedCustomer,
//           rushService: parsedOptions.rushService,
//           stores: parsedStores,
//           options: parsedOptions,
//           pricing: {
//             baseAmount,
//             extraFees,
//             totalAmount
//           }
//         }
//       ],
//       { session }
//     );

//     const createdOrder = returnOrder[0];

//     await session.commitTransaction();
//     session.endSession();

//     // Send confirmation email (non-blocking for main flow)
//     try {
//       const to = parsedCustomer.email;
//       if (to) {
//         const html = returnOrderCreatedTemplate(createdOrder);
//         await sendEmail({
//           to,
//           subject: "Your return order has been created",
//           html,
//         });
//       }
//     } catch (emailError) {
//       console.error("Failed to send return order email:", emailError);
//     }

//     return createdOrder;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };


/* last work one */

// export const createReturnOrderService = async ({ userId, body, files }) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     /**
//      * STORES (JSON – required)
//      */
//     if (!body.stores) {
//       throw new Error('Stores is required');
//     }

//     const parsedStores = JSON.parse(body.stores).map((store) => ({
//       ...store,
//       store: normalizeStore(store.store),
//     }));


//     /**
//      * CUSTOMER (build from form-data)
//      */
//     const parsedCustomer = {
//       fullName: body.fullName,
//       phone: body.phone,
//       unit: body.unit || '',
//       email: body.email,

//       address: {
//         zipCode: body.zipCode || '',
//         street: body.street || '',
//         city: body.city || '',
//         state: body.state || ''
//       },

//       pickupInstructions: body.pickupInstructions || '',

//       pickupLocation: {
//         address: body.address,
//         lat: Number(body.lat),
//         lng: Number(body.lng),
//         location: {
//           type: 'Point',
//           coordinates: [Number(body.lng), Number(body.lat)]
//         }
//       }
//     };

//     /**
//      * OPTIONS (build from form-data)
//      */
//     const parsedOptions = {
//       rushService: {
//         enabled: body.rushService === 'true'
//       },

//       physicalReturnLabel: {
//         enabled: body.physicalReturnLabel === 'true',
//         labelFiles: []
//       },

//       physicalReceipt: {
//         enabled: body.physicalReceipt === 'true',
//         creditCardLast4: body.creditCardLast4 || ''
//       },

//       message: {
//         enabled: body.leaveMessage === 'true',
//         note: body.messageNote || ''
//       }
//     };

//     /**
//      * Upload barcode images (store packages)
//      */
//     if (files?.barcodeImages?.length) {
//       let imageIndex = 0;

//       for (const store of parsedStores) {
//         for (const pkg of store.packages) {
//           if (!pkg.barcodeImages) pkg.barcodeImages = [];

//           if (files.barcodeImages[imageIndex]) {
//             const upload = await cloudinaryUpload(
//               files.barcodeImages[imageIndex].path,
//               `barcode_${Date.now()}_${imageIndex}`,
//               'return-orders/barcodes'
//             );

//             if (upload?.secure_url) {
//               pkg.barcodeImages.push(upload.secure_url);
//             }

//             imageIndex++;
//           }
//         }
//       }
//     }

//     /**
//      * Upload Physical Return Label Files (NEW)
//      */
//     if (
//       parsedOptions.physicalReturnLabel.enabled &&
//       files?.physicalReturnLabelFiles?.length
//     ) {
//       for (let i = 0; i < files.physicalReturnLabelFiles.length; i++) {
//         const file = files.physicalReturnLabelFiles[i];

//         const upload = await cloudinaryUpload(
//           file.path,
//           `physical_return_label_${Date.now()}_${i}`,
//           'return-orders/physical-return-labels'
//         );

//         if (upload?.secure_url) {
//           parsedOptions.physicalReturnLabel.labelFiles.push(upload.secure_url);
//         }
//       }
//     }

//     /**
//      * PRICING
//      */
//     let extraFees = 0;

//     if (parsedOptions.rushService.enabled) {
//       extraFees += FEES.RUSH_SERVICE;
//     }

//     if (parsedOptions.physicalReturnLabel.enabled) {
//       extraFees += FEES.PHYSICAL_RETURN_LABEL;
//     }

//     if (parsedOptions.physicalReceipt.enabled) {
//       extraFees += FEES.PHYSICAL_RECEIPT;
//     }

//     const baseAmount = 0;
//     const totalAmount = baseAmount + extraFees;

//     /**
//      * CREATE ORDER
//      */
//     const returnOrder = await ReturnOrder.create(
//       [
//         {
//           user: userId,
//           customer: parsedCustomer,
//           rushService: parsedOptions.rushService,
//           stores: parsedStores,
//           options: parsedOptions,
//           pricing: {
//             baseAmount,
//             extraFees,
//             totalAmount
//           }
//         }
//       ],
//       { session }
//     );

//     const createdOrder = returnOrder[0];

//     await session.commitTransaction();
//     session.endSession();

//     /**
//      * Send confirmation email (non-blocking)
//      */
//     try {
//       const to = parsedCustomer.email;
//       if (to) {
//         const html = returnOrderCreatedTemplate(createdOrder);
//         await sendEmail({
//           to,
//           subject: 'Your return order has been created',
//           html
//         });
//       }
//     } catch (emailError) {
//       console.error('Failed to send return order email:', emailError);
//     }

//     return createdOrder;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };



/* latest working one */

// export const createReturnOrderService = async ({ userId, body, files }) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     /**
//      * -------------------------------
//      * STORES (JSON – required)
//      * -------------------------------
//      */
//     if (!body.stores) {
//       throw new Error('Stores is required');
//     }

//     const parsedStores = JSON.parse(body.stores).map((store) => ({
//       ...store,
//       store: normalizeStore(store.store),
//       numberOfPackages: Number(store.numberOfPackages),
//       packages: Array.isArray(store.packages) ? store.packages : []
//     }));

//     /**
//      * ----------------------------------------
//      * AUTO-GENERATE PACKAGES IF MISSING
//      * ----------------------------------------
//      */
//     for (const store of parsedStores) {
//       if (!store.numberOfPackages || store.numberOfPackages < 1) {
//         throw new Error('numberOfPackages must be at least 1');
//       }

//       // Create empty packages if not provided
//       if (store.packages.length === 0) {
//         store.packages = Array.from(
//           { length: store.numberOfPackages },
//           () => ({})
//         );
//       }

//       // Ensure package count matches
//       if (store.packages.length !== store.numberOfPackages) {
//         throw new Error(
//           `Packages count mismatch for store ${store.store}`
//         );
//       }

//       // Normalize package fields
//       store.packages = store.packages.map((pkg) => ({
//         packageNumber: pkg.packageNumber?.trim() || '',
//         barcodeImages: Array.isArray(pkg.barcodeImages)
//           ? pkg.barcodeImages
//           : []
//       }));
//     }

//     /**
//      * -------------------------------
//      * CUSTOMER (form-data)
//      * -------------------------------
//      */
//     const parsedCustomer = {
//       fullName: body.fullName,
//       phone: body.phone,
//       unit: body.unit || '',
//       email: body.email,

//       address: {
//         zipCode: body.zipCode || '',
//         street: body.street || '',
//         city: body.city || '',
//         state: body.state || ''
//       },

//       pickupInstructions: body.pickupInstructions || '',

//       pickupLocation: {
//         address: body.address,
//         lat: Number(body.lat),
//         lng: Number(body.lng),
//         location: {
//           type: 'Point',
//           coordinates: [Number(body.lng), Number(body.lat)]
//         }
//       }
//     };

//     /**
//      * -------------------------------
//      * OPTIONS (form-data)
//      * -------------------------------
//      */
//     const parsedOptions = {
//       rushService: {
//         enabled: body.rushService === 'true'
//       },

//       physicalReturnLabel: {
//         enabled: body.physicalReturnLabel === 'true',
//         labelFiles: []
//       },

//       physicalReceipt: {
//         enabled: body.physicalReceipt === 'true',
//         creditCardLast4: body.creditCardLast4 || ''
//       },

//       message: {
//         enabled: body.leaveMessage === 'true',
//         note: body.messageNote || ''
//       }
//     };

//     /**
//      * ----------------------------------------
//      * UPLOAD BARCODE IMAGES (PACKAGE LEVEL)
//      * ----------------------------------------
//      */
//     if (files?.barcodeImages?.length) {
//       let imageIndex = 0;

//       for (const store of parsedStores) {
//         for (let i = 0; i < store.packages.length; i++) {
//           if (files.barcodeImages[imageIndex]) {
//             const upload = await cloudinaryUpload(
//               files.barcodeImages[imageIndex].path,
//               `barcode_${Date.now()}_${imageIndex}`,
//               'return-orders/barcodes'
//             );

//             if (upload?.secure_url) {
//               store.packages[i].barcodeImages.push(upload.secure_url);
//             }

//             imageIndex++;
//           }
//         }
//       }
//     }

//     /**
//      * ----------------------------------------
//      * UPLOAD PHYSICAL RETURN LABEL FILES
//      * ----------------------------------------
//      */
//     if (
//       parsedOptions.physicalReturnLabel.enabled &&
//       files?.physicalReturnLabelFiles?.length
//     ) {
//       for (let i = 0; i < files.physicalReturnLabelFiles.length; i++) {
//         const file = files.physicalReturnLabelFiles[i];

//         const upload = await cloudinaryUpload(
//           file.path,
//           `physical_return_label_${Date.now()}_${i}`,
//           'return-orders/physical-return-labels'
//         );

//         if (upload?.secure_url) {
//           parsedOptions.physicalReturnLabel.labelFiles.push(upload.secure_url);
//         }
//       }
//     }

//     /**
//      * -------------------------------
//      * PRICING
//      * -------------------------------
//      */
//     let extraFees = 0;

//     if (parsedOptions.rushService.enabled) {
//       extraFees += FEES.RUSH_SERVICE;
//     }

//     if (parsedOptions.physicalReturnLabel.enabled) {
//       extraFees += FEES.PHYSICAL_RETURN_LABEL;
//     }

//     if (parsedOptions.physicalReceipt.enabled) {
//       extraFees += FEES.PHYSICAL_RECEIPT;
//     }

//     const baseAmount = 0;
//     const totalAmount = baseAmount + extraFees;

//     /**
//      * -------------------------------
//      * CREATE RETURN ORDER
//      * -------------------------------
//      */
//     const [createdOrder] = await ReturnOrder.create(
//       [
//         {
//           user: userId,
//           customer: parsedCustomer,
//           rushService: parsedOptions.rushService,
//           stores: parsedStores,
//           options: parsedOptions,
//           pricing: {
//             baseAmount,
//             extraFees,
//             totalAmount
//           }
//         }
//       ],
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     /**
//      * -------------------------------
//      * SEND CONFIRMATION EMAIL (SAFE)
//      * -------------------------------
//      */
//     try {
//       if (parsedCustomer.email) {
//         const html = returnOrderCreatedTemplate(createdOrder);
//         await sendEmail({
//           to: parsedCustomer.email,
//           subject: 'Your return order has been created',
//           html
//         });
//       }
//     } catch (emailError) {
//       console.error('Email send failed:', emailError);
//     }

//     return createdOrder;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

export const createReturnOrderService = async ({ userId, body, files }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /**
     * =====================================================
     * 🔐 SUBSCRIPTION & PLAN VALIDATION (NEW)
     * =====================================================
     */
    const user = await User.findById(userId)
      .populate("subscription.planId")
      .session(session);

    if (!user || !user.subscription?.planId) {
      throw new Error("Active subscription required");
    }

    const plan = user.subscription.planId;

    // Expiry check (monthly / yearly)
    if (
      user.subscriptionExpireDate &&
      user.subscriptionExpireDate < new Date()
    ) {
      throw new Error("Subscription expired");
    }

    // Usage limit check (Pay-per-pickup)
    if (
      plan.limits?.maxReturnOrders !== null &&
      user.subscriptionUsage.returnOrdersUsed >= plan.limits.maxReturnOrders
    ) {
      throw new Error("Return order limit reached for this plan");
    }

    /**
     * -------------------------------
     * STORES (JSON – required)
     * -------------------------------
     */
    if (!body.stores) {
      throw new Error("Stores is required");
    }

    const parsedStores = JSON.parse(body.stores).map((store) => ({
      ...store,
      store: normalizeStore(store.store),
      numberOfPackages: Number(store.numberOfPackages),
      packages: Array.isArray(store.packages) ? store.packages : []
    }));

    /**
     * ----------------------------------------
     * AUTO-GENERATE PACKAGES IF MISSING
     * ----------------------------------------
     */
    for (const store of parsedStores) {
      if (!store.numberOfPackages || store.numberOfPackages < 1) {
        throw new Error("numberOfPackages must be at least 1");
      }

      if (store.packages.length === 0) {
        store.packages = Array.from(
          { length: store.numberOfPackages },
          () => ({})
        );
      }

      if (store.packages.length !== store.numberOfPackages) {
        throw new Error(`Packages count mismatch for store ${store.store}`);
      }

      store.packages = store.packages.map((pkg) => ({
        packageNumber: pkg.packageNumber?.trim() || "",
        barcodeImages: Array.isArray(pkg.barcodeImages)
          ? pkg.barcodeImages
          : []
      }));
    }

    /**
     * -------------------------------
     * CUSTOMER
     * -------------------------------
     */
    const parsedCustomer = {
      fullName: body.fullName,
      phone: body.phone,
      unit: body.unit || "",
      email: body.email,

      address: {
        zipCode: body.zipCode || "",
        street: body.street || "",
        city: body.city || "",
        state: body.state || ""
      },

      pickupInstructions: body.pickupInstructions || "",

      pickupLocation: {
        address: body.address,
        lat: Number(body.lat),
        lng: Number(body.lng),
        location: {
          type: "Point",
          coordinates: [Number(body.lng), Number(body.lat)]
        }
      }
    };

    /**
     * -------------------------------
     * OPTIONS
     * -------------------------------
     */
    const parsedOptions = {
      rushService: {
        enabled: body.rushService === "true"
      },

      physicalReturnLabel: {
        enabled: body.physicalReturnLabel === "true",
        labelFiles: []
      },

      physicalReceipt: {
        enabled: body.physicalReceipt === "true",
        creditCardLast4: body.creditCardLast4 || ""
      },

      message: {
        enabled: body.leaveMessage === "true",
        note: body.messageNote || ""
      }
    };

    /**
     * ----------------------------------------
     * UPLOAD BARCODE IMAGES
     * ----------------------------------------
     */
    if (files?.barcodeImages?.length) {
      let imageIndex = 0;

      for (const store of parsedStores) {
        for (let i = 0; i < store.packages.length; i++) {
          if (files.barcodeImages[imageIndex]) {
            const upload = await cloudinaryUpload(
              files.barcodeImages[imageIndex].path,
              `barcode_${Date.now()}_${imageIndex}`,
              "return-orders/barcodes"
            );

            if (upload?.secure_url) {
              store.packages[i].barcodeImages.push(upload.secure_url);
            }

            imageIndex++;
          }
        }
      }
    }

    /**
     * ----------------------------------------
     * UPLOAD PHYSICAL RETURN LABEL FILES
     * ----------------------------------------
     */
    if (
      parsedOptions.physicalReturnLabel.enabled &&
      files?.physicalReturnLabelFiles?.length
    ) {
      for (let i = 0; i < files.physicalReturnLabelFiles.length; i++) {
        const upload = await cloudinaryUpload(
          files.physicalReturnLabelFiles[i].path,
          `physical_return_label_${Date.now()}_${i}`,
          "return-orders/physical-return-labels"
        );

        if (upload?.secure_url) {
          parsedOptions.physicalReturnLabel.labelFiles.push(upload.secure_url);
        }
      }
    }

    /**
     * -------------------------------
     * 💰 PRICING (ENTITLEMENTS APPLIED)
     * -------------------------------
     */
/**
 * -------------------------------
 * 💰 PRICING (ENTITLEMENTS APPLIED)
 * -------------------------------
 */
/**
 * -------------------------------
 * 💰 PRICING (OPTION B – REVERSED)
 * -------------------------------
 */
let baseAmount = 0;
let extraFees = 0;

/**
 * -------------------------------
 * PHYSICAL RETURN LABEL
 * Charge ONLY if plan entitlement === true
 * -------------------------------
 */
if (
  parsedOptions.physicalReturnLabel.enabled &&
  plan.entitlements?.freePhysicalReturnLabel === true
) {
  extraFees += FEES.PHYSICAL_RETURN_LABEL;
}

/**
 * -------------------------------
 * PHYSICAL RECEIPT
 * Charge ONLY if plan entitlement === true
 * -------------------------------
 */
if (
  parsedOptions.physicalReceipt.enabled &&
  plan.entitlements?.freePhysicalReceipt === true
) {
  extraFees += FEES.PHYSICAL_RECEIPT;
}

/**
 * -------------------------------
 * RUSH SERVICE
 * Charge ONLY if entitlement === true
 * -------------------------------
 */
if (
  parsedOptions.rushService.enabled &&
  plan.entitlements?.rushService === true
) {
  extraFees += FEES.RUSH_SERVICE;
}

const totalAmount = baseAmount + extraFees;



    /**
     * -------------------------------
     * CREATE RETURN ORDER
     * -------------------------------
     */
    const [createdOrder] = await ReturnOrder.create(
      [
        {
          user: userId,
          customer: parsedCustomer,
          rushService: parsedOptions.rushService,
          stores: parsedStores,
          options: parsedOptions,
          pricing: {
            baseAmount,
            extraFees,
            totalAmount
          }
        }
      ],
      { session }
    );

    user.subscriptionUsage.returnOrdersUsed += 1;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    /**
     * -------------------------------
     * SEND CONFIRMATION EMAIL (SAFE)
     * -------------------------------
     */
    if (createdOrder.pricing.totalAmount === 0) {
      try {
        if (parsedCustomer.email) {
          const html = returnOrderCreatedTemplate(createdOrder);

          await sendEmail({
            to: parsedCustomer.email,
            subject: "Your return order has been created",
            html
          });
        }
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }
    }

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};



export const getMyReturnOrdersService = async (userId, { page = 1, limit = 10, status }) => {
  page = Number(page);
  limit = Number(limit);

  

  const filter = { user: userId };
  if (status) filter.status = status;

   

  const skip = (page - 1) * limit;


  const [data, totalData] = await Promise.all([
    ReturnOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ReturnOrder.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalData / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};


// ─────────────────────────────
// DETAILS
// ─────────────────────────────
export const getMyReturnOrderByIdService = async (userId, orderId) => {
  const order = await ReturnOrder.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error("Order not found");
  return order;
};



export const getReturnOrderDetailsService = async (orderId) => {
  const order = await ReturnOrder.findById(orderId)
    .populate({
      path: "user",
      select: "firstName lastName email phone subscription",
      populate: {
        path: "subscription.planId",
        model: "Plan"
      }
    })
    .populate("assignedDriver", "firstName lastName email phone")
    .lean();

  if (!order) {
    throw new Error("Return order not found");
  }

  return order;
};


// ─────────────────────────────
// UPDATE (TEXT + FILES) while PENDING
// ─────────────────────────────
export const updateMyReturnOrderService = async (userId, orderId, payload, files) => {
  const order = await ReturnOrder.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error("Order not found");

  // Cancel using update: status=CANCELLED
  if (payload.status === "CANCELLED") {
    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      throw new Error("Order can’t be cancelled");
    }
    order.status = "CANCELLED";
    await order.save();
    return order;
  }

  // Only editable while pending
  if (order.status !== "PENDING") throw new Error("Order can’t be updated now");

  // ─────────────────────────────
  // Update normal text fields (if sent)
  // ─────────────────────────────
  const updatable = [
    "fullName",
    "pickupAddress",
    "phone",
    "unit",
    "email",
    "zipCode",
    "street",
    "city",
    "pickupInstructions",
    "returnStore",
  ];

 updatable.forEach((k) => {
    if (payload[k] !== undefined) {
      // ✅ CHANGED: Updated field mapping to handle customer.address.state
      if (k === 'state' || k === 'zipCode' || k === 'street' || k === 'city') {
        order.customer.address[k] = payload[k];
      } else if (k === 'fullName' || k === 'phone' || k === 'unit' || k === 'email' || k === 'pickupInstructions') {
        order.customer[k] = payload[k];
      } else {
        order[k] = payload[k];
      }
    }
  });

  // ─────────────────────────────
  // Booleans + conditional fields
  // ─────────────────────────────
  if (payload.isReturningAnotherStore !== undefined) {
    order.isReturningAnotherStore = toBool(payload.isReturningAnotherStore);
  }
  if (payload.printShippingLabel !== undefined) {
    order.printShippingLabel = toBool(payload.printShippingLabel);
  }

  if (payload.hasReceipt !== undefined) {
    order.hasReceipt = toBool(payload.hasReceipt);
    if (!order.hasReceipt) order.creditCardLast4 = "";
  }
  if (payload.creditCardLast4 !== undefined) {
    order.creditCardLast4 = payload.creditCardLast4 || "";
  }

  if (payload.needShippingLabel !== undefined) {
    order.needShippingLabel = toBool(payload.needShippingLabel);
    if (!order.needShippingLabel) {
      order.pickupAndReturnAddress = "";
      order.productLength = "";
      order.productWidth = "";
      order.productHeight = "";
      order.productWeight = "";
    }
  }

  // allow red fields update
  if (payload.pickupAndReturnAddress !== undefined) {
    order.pickupAndReturnAddress = payload.pickupAndReturnAddress || "";
  }
  if (payload.productLength !== undefined) order.productLength = payload.productLength || "";
  if (payload.productWidth !== undefined) order.productWidth = payload.productWidth || "";
  if (payload.productHeight !== undefined) order.productHeight = payload.productHeight || "";
  if (payload.productWeight !== undefined) order.productWeight = payload.productWeight || "";

  if (payload.leaveMessage !== undefined) {
    order.leaveMessage = toBool(payload.leaveMessage);
    if (!order.leaveMessage) order.messageNote = "";
  }
  if (payload.messageNote !== undefined) {
    order.messageNote = payload.messageNote || "";
  }

  // ─────────────────────────────
  // Update packageNumbers (optional if packages JSON sent)
  // ─────────────────────────────
  if (payload.packages !== undefined) {
    let packagesMeta = [];
    try {
      packagesMeta = payload.packages ? JSON.parse(payload.packages) : [];
    } catch {
      throw new Error("Invalid packages format");
    }

    if (!Array.isArray(packagesMeta) || packagesMeta.length !== order.numberOfPackages) {
      throw new Error("Packages count mismatch");
    }

    if (!Array.isArray(order.packages)) order.packages = [];
    while (order.packages.length < order.numberOfPackages) {
      order.packages.push({ packageNumber: "", barcodeImages: [] });
    }

    for (let i = 0; i < order.numberOfPackages; i++) {
      if (packagesMeta[i]?.packageNumber !== undefined) {
        order.packages[i].packageNumber = packagesMeta[i].packageNumber || "";
      }
    }
  }

  // ─────────────────────────────
  // ✅ Replace barcode images only for uploaded indices
  // ─────────────────────────────
  if (files && typeof files === "object") {
    if (!Array.isArray(order.packages)) order.packages = [];
    while (order.packages.length < order.numberOfPackages) {
      order.packages.push({ packageNumber: "", barcodeImages: [] });
    }

    for (let i = 0; i < order.numberOfPackages; i++) {
      const fieldName = `barcode_${i}`;
      const pkgFiles = files?.[fieldName] || [];

      if (pkgFiles.length > 0) {
        const barcodeImages = [];

        for (const f of pkgFiles) {
          const up = await cloudinaryUpload(
            f.path,
            `barcode-${userId}-${i}-${Date.now()}`,
            "return-orders/barcodes"
          );
          if (up?.secure_url) barcodeImages.push(up.secure_url);
        }

        // replace old barcodes for this package
        order.packages[i].barcodeImages = barcodeImages;
      }
    }
  }

  // ─────────────────────────────
  // Validations
  // ─────────────────────────────
  if (order.hasReceipt && !order.creditCardLast4) {
    throw new Error("creditCardLast4 is required");
  }

  if (order.needShippingLabel) {
    if (!order.pickupAndReturnAddress) throw new Error("pickupAndReturnAddress is required");
    if (!order.productLength || !order.productWidth || !order.productHeight || !order.productWeight) {
      throw new Error("Product dimensions and weight are required");
    }
  }

  await order.save();
  return order;
};

export const driverUpdateReturnOrderStatusService = async (driverId, orderId, status) => {
  if (!status) throw new Error("Status is required");

  const allowed = ["ON_MY_WAY", "PICKED_UP", "COMPLETED"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const order = await ReturnOrder.findById(orderId);
  if (!order) throw new Error("Order not found");

  // ✅ Verify this driver is assigned to this order
  if (order.assignedDriver?.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this order");
  }

  // block updates if already completed/cancelled
  if (["COMPLETED", "CANCELLED"].includes(order.status)) {
    throw new Error("Order can't be updated now");
  }

  // Optional: enforce flow order (recommended)
  const flow = {
    PENDING: ["ON_MY_WAY"],
    ON_MY_WAY: ["PICKED_UP"],
    PICKED_UP: ["COMPLETED"]
  };

  const possible = flow[order.status] || [];
  if (!possible.includes(status)) {
    throw new Error("Invalid status flow");
  }

  order.status = status;

  // ✅ Auto-accept assignment when driver starts
  if (status === "ON_MY_WAY" && order.assignmentStatus === "ASSIGNED") {
    order.assignmentStatus = "ACCEPTED";
  }

  await order.save();

    // Send status update email to customer
  try {
    const to = order.customer?.email;
    if (to) {
      const html = returnOrderStatusUpdateTemplate({ order, status });
      await sendEmail({
        to,
        subject: `Return order update: ${status === "ON_MY_WAY" ? "Driver on the way" : status === "PICKED_UP" ? "Package picked up" : status === "COMPLETED" ? "Completed" : status}`,
        html,
      });
    }
  } catch (emailError) {
    console.error("Failed to send return order status email:", emailError);
  }


  return order;
};


export const addReviewToReturnOrderService = async (userId, orderId, { rating, comment }) => {
  if (!rating) throw new Error("Rating is required");
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) throw new Error("Rating must be 1 to 5");

  const order = await ReturnOrder.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error("Order not found");

  if (order.status !== "COMPLETED") throw new Error("You can review only after delivery completed");

  // optional: prevent multiple reviews
  if (order.review?.rating) throw new Error("Review already submitted");

  order.review = {
    rating: r,
    comment: comment ? String(comment).trim() : "",
    reviewedAt: new Date()
  };

  await order.save();
  return order;
};


export const getAllReviewsService = async ({ page = 1, limit = 10 }) => {
  page = Number(page);
  limit = Number(limit);

  const filter = { "review.rating": { $ne: null } };
  const skip = (page - 1) * limit;

  const [data, totalData, ratingStats] = await Promise.all([
    ReturnOrder.find(filter)
      .select("review customer.fullName returnStore status createdAt updatedAt")
      .sort({ "review.reviewedAt": -1 })
      .skip(skip)
      .limit(limit),
    ReturnOrder.countDocuments(filter),
    ReturnOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$review.rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalPages = Math.ceil(totalData / limit);
  const { avgRating = 0, ratingCount = 0 } = ratingStats[0] ?? {};

  return {
    avgRating: Math.round(avgRating * 10) / 10, // e.g. 4.3
    ratingCount,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};


export const adminGetPickupHistoryService = async ({
  page = 1,
  limit = 10,
  status,
  search
}) => {
  page = Number(page);
  limit = Number(limit);

  const filter = {
    status: { $ne: "PENDING" } // ✅ everything except pending
  };

  // optional filter by status
  if (status) filter.status = status;

  // optional simple search (name/email/phone)
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { "customer.fullName": re },
      { "customer.email": re },
      { "customer.phone": re }
    ];
  }

  const skip = (page - 1) * limit;

  const [data, totalData] = await Promise.all([
    ReturnOrder.find(filter)
      .sort({ updatedAt: -1 }) // ✅ latest first (status updates)
      .skip(skip)
      .limit(limit),
    ReturnOrder.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalData / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};


export const adminGetPickupByIdService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw new Error("Pickup not found");

  const order = await ReturnOrder.findById(orderId).populate(
    "user",
    "fullName email phone"
  );

  if (!order) throw new Error("Pickup not found");
  return order;
};


export const getPendingReturnOrdersAdminService = async ({
  zipCode,
  street,
  city,
  state,
  search,
  page,
  limit
}) => {
  const matchStage = {
    status: "PENDING",
    paymentStatus: "PAID"
  };

  // Address filters
  if (zipCode) {
    matchStage["customer.address.zipCode"] = zipCode;
  }

  if (city) {
    matchStage["customer.address.city"] = {
      $regex: city,
      $options: "i"
    };
  }

  // ✅ ADDED: State filter
  if (state) {
    matchStage["customer.address.state"] = {
      $regex: state,
      $options: "i"
    };
  }

  if (street) {
    matchStage["customer.address.street"] = {
      $regex: street,
      $options: "i"
    };
  }

  const pipeline = [
    { $match: matchStage },

    // 🔗 Join users collection
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }
    },

    { $unwind: "$user" }
  ];

  // 🔍 Search on user fields
  if (search) {
    const searchRegex = new RegExp(search, "i");

    pipeline.push({
      $match: {
        $or: [
          { "user.firstName": searchRegex },
          { "user.lastName": searchRegex },
          { "user.email": searchRegex }
        ]
      }
    });
  }

  // Pagination + sorting
  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        meta: [
          { $count: "total" }
        ]
      }
    }
  );

  const result = await ReturnOrder.aggregate(pipeline);

  const orders = result[0]?.data || [];
  const total = result[0]?.meta[0]?.total || 0;

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    orders
  };
};




// export const generateRouteService = async (driverId) => {
//   // 1️⃣ Fetch driver with location
//   const driver = await User.findById(driverId).select("location");

//   if (!driver || !driver.location) {
//     throw new Error("Driver location not found");
//   }

//   // 2️⃣ Fetch assigned return orders
//   const orders = await ReturnOrder.find({
//     assignedDriver: driverId,
//     assignmentStatus: "ASSIGNED",
//     status: { $nin: ["CANCELLED", "COMPLETED"] }
//   }).select("customer.pickupLocation customer.firstName customer.lastName");

//   if (!orders.length) {
//     throw new Error("No assigned pickup locations found");
//   }

//   // 3️⃣ Prepare Google Maps params
//   const origin = `${driver.location.lat},${driver.location.lng}`;

//   const waypoints = orders.map(o =>
//     `${o.customer.pickupLocation.lat},${o.customer.pickupLocation.lng}`
//   );

//   const destination = waypoints.length === 1 ? waypoints[0] : origin;

//   // 4️⃣ Call Google Directions API
//   const response = await axios.get(
//     "https://maps.googleapis.com/maps/api/directions/json",
//     {
//       params: {
//         origin,
//         destination,
//         waypoints:
//           waypoints.length > 1
//             ? `optimize:true|${waypoints.join("|")}`
//             : undefined,
//         key: process.env.GOOGLE_MAPS_API_KEY
//       }
//     }
//   );

//   const route = response.data.routes?.[0];
//   if (!route) throw new Error("Failed to generate route");

//   // 5️⃣ Clean response for frontend
//   return {
//     driver: {
//       address: driver.location.address || '',
//       lat: driver.location.lat,
//       lng: driver.location.lng
//     },

//     pickups: orders.map((o, index) => ({
//       customer: `${o.customer.firstName} ${o.customer.lastName}`,
//       address: o.customer.pickupLocation.address,
//       lat: o.customer.pickupLocation.lat,
//       lng: o.customer.pickupLocation.lng,
//       orderIndex: index
//     })),

//     polyline: route.overview_polyline.points,

//     totalDistance: route.legs.reduce(
//       (sum, leg) => sum + leg.distance.value,
//       0
//     ),

//     totalDuration: route.legs.reduce(
//       (sum, leg) => sum + leg.duration.value,
//       0
//     ),

//     optimizedOrder: route.waypoint_order || [],
//     legs: route.legs
//   };
// };


// last one good one

// export const generateDriverRouteService = async ({
//   driverId,
//   orderIds,
//   currentLocation
// }) => {
//   // Fetch driver (fallback location)
//   const driver = await User.findById(driverId).select("location");

//   if (!driver) {
//     throw new Error("Driver not found");
//   }

//   // Determine origin
//   let origin;

//   if (currentLocation?.lat && currentLocation?.lng) {
//     origin = `${currentLocation.lat},${currentLocation.lng},${currentLocation.address || ''}`;
//   } else if (driver.location?.lat && driver.location?.lng) {
//     origin = `${driver.location.lat},${driver.location.lng},${driver.location.address || ''}`;
//   } else {
//     throw new Error("Driver location not available");
//   }

//   // Fetch assigned orders only
// const orders = await ReturnOrder.find({
//   _id: { $in: orderIds },
//   assignedDriver: driverId,
//   assignmentStatus: { $in: ["ASSIGNED", "ACCEPTED"] },
//   status: { $in: ["PENDING", "ON_MY_WAY", "PICKED_UP"] }
// }).select("customer.pickupLocation customer.fullName status rushService");

//   if (!orders.length) {
//     throw new Error("No valid assigned orders found");
//   }

//   // Prepare waypoints
//   const waypoints = orders.map(o =>
//     `${o.customer.pickupLocation.lat},${o.customer.pickupLocation.lng}`
//   );

//   const destination = waypoints.length === 1 ? waypoints[0] : origin;

//   // Google Directions API
//   const response = await axios.get(
//     "https://maps.googleapis.com/maps/api/directions/json",
//     {
//       params: {
//         origin,
//         destination,
//         waypoints:
//           waypoints.length > 1
//             ? `optimize:true|${waypoints.join("|")}`
//             : undefined,
//         key: process.env.GOOGLE_MAPS_API_KEY
//       }
//     }
//   );

//   const route = response.data.routes?.[0];
//   if (!route) throw new Error("Failed to generate route");

//   // Clean response
//   return {
//     origin,
//     pickups: orders.map((o, index) => ({
//      customer: o.customer.fullName,
//       address: o.customer.pickupLocation.address,
//       lat: o.customer.pickupLocation.lat,
//       lng: o.customer.pickupLocation.lng,
//       orderIndex: index,
//       id: o._id,
//       status: o.status,
//       rushService: o.rushService
//     })),
//     polyline: route.overview_polyline.points,
//     totalDistance: route.legs.reduce(
//       (sum, leg) => sum + leg.distance.value,
//       0
//     ),
//     totalDuration: route.legs.reduce(
//       (sum, leg) => sum + leg.duration.value,
//       0
//     ),
//     optimizedOrder:
//       waypoints.length === 1 ? [0] : route.waypoint_order || [],
//     legs: route.legs
//   };
// };


export const generateDriverRouteService = async ({
  driverId,
  orderIds,
  currentLocation
}) => {
  // Fetch driver (fallback location)
  const driver = await User.findById(driverId).select("location");

  if (!driver) {
    throw new Error("Driver not found");
  }

  // Determine origin
  let origin;

  if (currentLocation?.lat && currentLocation?.lng) {
    origin = `${currentLocation.lat},${currentLocation.lng},${currentLocation.address || ''}`;
  } else if (driver.location?.lat && driver.location?.lng) {
    origin = `${driver.location.lat},${driver.location.lng},${driver.location.address || ''}`;
  } else {
    throw new Error("Driver location not available");
  }

  // Fetch assigned orders only
  const orders = await ReturnOrder.find({
    _id: { $in: orderIds },
    assignedDriver: driverId,
    assignmentStatus: { $in: ["ASSIGNED", "ACCEPTED"] },
    status: { $in: ["PENDING", "ON_MY_WAY", "PICKED_UP"] }
  })
  .select("customer.pickupLocation customer.fullName status rushService user")
  .populate({
    path: "user",
    select: "subscription",
    populate: {
      path: "subscription.planId",
      select: "title"
    }
  });

  if (!orders.length) {
    throw new Error("No valid assigned orders found");
  }

  // Prepare waypoints
  const waypoints = orders.map(o =>
    `${o.customer.pickupLocation.lat},${o.customer.pickupLocation.lng}`
  );

  const destination = waypoints.length === 1 ? waypoints[0] : origin;

  // Google Directions API
  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/directions/json",
    {
      params: {
        origin,
        destination,
        waypoints:
          waypoints.length > 1
            ? `optimize:true|${waypoints.join("|")}`
            : undefined,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    }
  );

  // console.log(response.data);
  const route = response.data.routes?.[0];
  if (!route) throw new Error("Failed to generate route");

  // Clean response
  return {
    origin,
    pickups: orders.map((o, index) => ({
      customer: o.customer.fullName,
      address: o.customer.pickupLocation.address,
      lat: o.customer.pickupLocation.lat,
      lng: o.customer.pickupLocation.lng,
      orderIndex: index,
      id: o._id,
      status: o.status,
      rushService: o.rushService,
      planTitle: o.user?.subscription?.planId?.title || null
    })),
    polyline: route.overview_polyline.points,
    totalDistance: route.legs.reduce(
      (sum, leg) => sum + leg.distance.value,
      0
    ),
    totalDuration: route.legs.reduce(
      (sum, leg) => sum + leg.duration.value,
      0
    ),
    optimizedOrder:
      waypoints.length === 1 ? [0] : route.waypoint_order || [],
    legs: route.legs
  };
};


export const assignDriverToReturnOrdersService = async (
  driverId,
  orderIds,
  adminId
) => {
  // Validate driver
  const driver = await User.findOne({
    _id: driverId,
    role: RoleType.DRIVER,
    driverRequestStatus: 'APPROVED'
  }).select('fullName email phone');

  if (!driver) {
    throw {
      statusCode: 404,
      message: 'Driver not found or not approved'
    };
  }

  // Fetch valid return orders
  const orders = await ReturnOrder.find({
    _id: { $in: orderIds },
    status: { $nin: ['CANCELLED', 'COMPLETED'] }
  }).select('_id');

  if (!orders.length) {
    throw {
      statusCode: 404,
      message: 'No valid return orders found for assignment'
    };
  }

  const validOrderIds = orders.map(o => o._id);

  // Bulk update
  const bulkOps = validOrderIds.map(orderId => ({
    updateOne: {
      filter: { _id: orderId },
      update: {
        $set: {
          assignedDriver: driverId,
          assignedAt: new Date(),
          assignmentStatus: 'ASSIGNED'
        }
      }
    }
  }));

  const bulkResult = await ReturnOrder.bulkWrite(bulkOps);

  // Re-fetch populated orders
  const populatedOrders = await ReturnOrder.find({
    _id: { $in: validOrderIds }
  })
    .populate({
      path: 'assignedDriver',
      select: 'firstName lastName email phone'
    })
    .select(
      '_id status assignmentStatus assignedAt pricing customer.fullName customer.phone stores'
    )
    .sort({ assignedAt: -1 });

  // Final response
  return {
    assignedDriver: {
      id: driver._id,
      name: driver.fullName,
      email: driver.email,
      phone: driver.phone
    },
    orders: populatedOrders,
    matchedOrders: validOrderIds.length,
    modifiedCount: bulkResult.modifiedCount
  };
};


// Update the existing getMyAssignedReturnOrdersService
// export const getMyAssignedReturnOrdersService = async (driverId) => {
//   const orders = await ReturnOrder.find({
//     assignedDriver: driverId,
//     assignmentStatus: { $in: ["ASSIGNED", "ACCEPTED"] },
//     status: { $in: ["PENDING", "ON_MY_WAY", "PICKED_UP"] } // ✅ Include in-progress statuses
//   })
//     .populate("user", "firstName lastName email phone")
//     .select(
//       "status customer pricing stores createdAt updatedAt assignedAt assignmentStatus"
//     )
//     .sort({ assignedAt: 1 }); // ✅ Oldest assignments first

//   return orders;
// };



export const getMyAssignedReturnOrdersService = async (driverId) => {
  const orders = await ReturnOrder.find({
    assignedDriver: driverId,
    assignmentStatus: { $in: ["ASSIGNED", "ACCEPTED"] },
    status: { $in: ["PENDING", "ON_MY_WAY", "PICKED_UP"] }
  })
    .populate({
      path: "user",
      select: "firstName lastName email phone subscription",
      populate: {
        path: "subscription.planId",
        model: "Plan",
        select: `
          title
          name
          price
          billingCycle
          displayFeatures
          numberOfPackages
          limits
          entitlements
          status
        `
      }
    })
    .select(
      "status customer pricing stores createdAt updatedAt assignedAt assignmentStatus rushService"
    )
    .sort({ assignedAt: 1 });

  return orders;
};




// // Count how many completed return orders a driver has done
// export const getDriverCompletedTripsCountService = async (driverId) => {
//   const totalCompletedTrips = await ReturnOrder.countDocuments({
//     assignedDriver: driverId,
//     status: "COMPLETED",
//   });

//   return { totalCompletedTrips };
// };



// Add this new service function for completed orders
export const getMyCompletedReturnOrdersService = async (driverId, { page = 1, limit = 10 }) => {
  page = Number(page);
  limit = Number(limit);
  const skip = (page - 1) * limit;

  const filter = {
    assignedDriver: driverId,
    status: "COMPLETED"
  };

  const [data, totalData] = await Promise.all([
    ReturnOrder.find(filter)
      .populate("user", "firstName lastName email phone")
      .select("status customer pricing stores createdAt updatedAt assignedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    ReturnOrder.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalData / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};









export const adminGetAllReturnOrdersService = async ({ page = 1, limit = 15 }) => {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.max(Number(limit) || 15, 1);
  const skip = (p - 1) * l;

  const [data, total] = await Promise.all([
    ReturnOrder.find({})
      .populate("user", "firstName lastName email phone")
      .populate("assignedDriver", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l),
    ReturnOrder.countDocuments({})
  ]);

  return {
    data,
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l),
      hasNextPage: p * l < total,
      hasPrevPage: p > 1
    }
  };
};

export const adminGetReturnOrderByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Order not found");
  const order = await ReturnOrder.findById(id)
    .populate("user", "firstName lastName email phone")
    .populate("assignedDriver", "firstName lastName email phone")
    .lean();
  if (!order) throw new Error("Order not found");
  return order;
};

export const adminDeleteReturnOrderService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Order not found");
  const deleted = await ReturnOrder.findByIdAndDelete(id);
  if (!deleted) throw new Error("Order not found");
  return true;
};
