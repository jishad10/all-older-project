import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' }, 
    name: { type: String, required: true, unique: true },

    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: ['basic', 'monthly', 'yearly'],
      required: true
    },

    displayFeatures: {
      type: [String],
      default: []
    },

    numberOfPackages: {
      type: Number,
      default: 0
    },

    limits: {
      maxReturnOrders: {
        type: Number,
        default: null 
      }
    },

    entitlements: {
      rushService: {
        type: Boolean,
        default: false
      },
      freePhysicalReturnLabel: {
        type: Boolean,
        default: false
      },
      freePhysicalReceipt: {
        type: Boolean,
        default: false
      }
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);


const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);
export default Plan;





// const PlanSchema = new mongoose.Schema(
//   {
//     title: { type: String, default: '' },
//     name: { type: String, required: true, unique: true, trim: true },
//     price: { type: Number, required: true, min: 0 },
//     billingCycle: { type: String, required: true, enum: ['basic','monthly','yearly'] },

//     features: { type: [String], default: [] },

//     status: { type: String, enum: ['active', 'inactive'], default: 'active' },
//   },
//   { timestamps: true }
// );
