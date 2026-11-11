import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RETURN_STORES = [
  "KOHL'S",
  "STAPLES",
  "SHEIN RETURN",
  "TARGET",
  "WALMART",
  "HOME DEPOT",
  "WHOLE FOODS MARKET",
  "UPS DROP OFF",
  "USPS DROP OFF",
  "FEDEX DROP OFF",
  "OTHER"
];

export const FEES = {
  PHYSICAL_RETURN_LABEL: 3.5,
  PHYSICAL_RECEIPT: 8.0,
  RETURN_SHIPPING_LABEL: 3.5,
  RUSH_SERVICE: 15.0
};


// location sub-schema
const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    location: { type: geoPointSchema, required: true }
  },
  { _id: false }
);


// PACKAGE SCHEMA
const packageSchema = new Schema(
  {
    packageNumber: { type: String, trim: true, default: '' },
    barcodeImages: { type: [String], default: [] }
  },
  { _id: false }
);

// In storeReturnSchema, add otherStoreName with a conditional validator
const storeReturnSchema = new Schema(
  {
    store: { type: String, enum: RETURN_STORES, required: true },
    otherStoreName: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (this.store === 'Other') return Boolean(v && v.trim());
          return true;
        },
        message: 'Other store name is required when store is Other'
      }
    },
    numberOfPackages: { type: Number, required: true, min: 1 },
    packages: { type: [packageSchema], default: [], 
      validate: {
      validator: function (packages) {
        // numberOfPackages must match package count
        return packages.length === this.numberOfPackages;
      },
    message: 'Packages count must match numberOfPackages'
  } },
  },
  { _id: false }
);


// // PACKAGE SCHEMA
// const packageSchema = new Schema(
//   {
//     packageNumber: { type: String, required: true, trim: true },
//     barcodeImages: { type: [String], default: [] }
//   },
//   { _id: false }
// );

// // In storeReturnSchema, add otherStoreName with a conditional validator
// const storeReturnSchema = new Schema(
//   {
//     store: { type: String, enum: RETURN_STORES, required: true },
//     otherStoreName: {
//       type: String,
//       trim: true,
//       default: '',
//       validate: {
//         validator: function (v) {
//           if (this.store === 'Other') return Boolean(v && v.trim());
//           return true;
//         },
//         message: 'Other store name is required when store is Other'
//       }
//     },
//     numberOfPackages: { type: Number, required: true, min: 1 },
//     packages: { type: [packageSchema], required: true }
//   },
//   { _id: false }
// );


// RUSH SERVICE SCHEMA
const rushServiceLabelSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    fee: { type: Number, default: FEES.RUSH_SERVICE }
  },
  { _id: false }
);


// EXTRA OPTIONS SCHEMAS
const physicalReturnLabelSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    fee: { type: Number, default: FEES.PHYSICAL_RETURN_LABEL },
    labelFiles: {
      type: [String], 
      default: []
    }
  },
  { _id: false }
);

const physicalReceiptSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    creditCardLast4: { type: String, default: '', trim: true },
    fee: { type: Number, default: FEES.PHYSICAL_RECEIPT }
  },
  { _id: false }
);

// const returnShippingLabelSchema = new Schema(
//   {
//     enabled: { type: Boolean, default: false },
//     pickupAndReturnAddress: { type: String, default: '', trim: true },
//     dimensions: {
//       length: { type: Number },
//       width: { type: Number },
//       height: { type: Number },
//       weight: { type: Number }
//     },
//     fee: { type: Number, default: FEES.RETURN_SHIPPING_LABEL }
//   },
//   { _id: false }
// );

const messageSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    note: { type: String, default: '', trim: true }
  },
  { _id: false }
);


const ReturnOrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // CUSTOMER INFO
    customer: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      unit: { type: String, default: '', trim: true },
      
      email: { type: String, required: true, lowercase: true, trim: true },

      address: {
        zipCode: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' }
      },

      pickupInstructions: { type: String, default: '' },
      pickupLocation: { type: locationSchema, required: true }
    },

    rushService: rushServiceLabelSchema,
    
    // MULTI-STORE PACKAGE RETURNS
    stores: {
      type: [storeReturnSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0
    },

    // EXTRA OPTIONS
    options: {
      physicalReturnLabel: physicalReturnLabelSchema,
      physicalReceipt: physicalReceiptSchema,
      // returnShippingLabel: returnShippingLabelSchema,
      message: messageSchema
    },

    // PRICING (FOR PAYMENTS)
    pricing: {
      baseAmount: { type: Number, default: 0 },
      extraFees: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 }
    },

    // STATUS
    status: {
      type: String,
      enum: ['PENDING', 'ON_MY_WAY', 'PICKED_UP', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELED"],
      default: 'PENDING',
      index: true
    },

    // REVIEW
    review: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, default: '', trim: true },
      reviewedAt: { type: Date, default: null }
    },

    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    assignedAt: {
      type: Date,
      default: null
    },

    assignmentStatus: {
      type: String,
      enum: ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'REJECTED'],
      default: 'UNASSIGNED',
      index: true
    }
  },
  { timestamps: true }
);


ReturnOrderSchema.index({
  'customer.pickupLocation.location': '2dsphere'
});


const ReturnOrder =
  mongoose.models.ReturnOrder ||
  mongoose.model('ReturnOrder', ReturnOrderSchema);

export default ReturnOrder;
