import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    name: { type: String, required: true, unique: true },

    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: ['free', 'monthly', 'yearly'],
      required: true
    },

    // Roles this plan is available to: LANDLORD, AGENT
    targetRoles: {
      type: [String],
      enum: ['LANDLORD', 'AGENT'],
      default: ['LANDLORD', 'AGENT']
    },

    // Max properties allowed on this plan (null = unlimited)
    maxProperties: {
      type: Number,
      default: null
    },

    displayFeatures: {
      type: [String],
      default: []
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