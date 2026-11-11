import RoleType from '../../lib/types.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  accessTokenExpires,
  accessTokenSecrete,
  refreshTokenExpires,
  refreshTokenSecrete,
} from '../../core/config/config.js';


const AddressSchema = new mongoose.Schema({
  country:    { type: String, default: '' },
  cityState:  { type: String, default: '' },
  roadArea:   { type: String, default: '' },
  postalCode: { type: String, default: '' },
  taxId:      { type: String, default: '' },
}, { _id: false });


// Individual entity info — for LANDLORD / AGENT who chose "individual"
const IndividualSchema = new mongoose.Schema({
  operatingLocations: { type: [mongoose.Schema.Types.ObjectId], ref: 'Island', default: [] },
  numberOfProperties: { type: Number, default: 0 },
}, { _id: false });


// Business entity info — for LANDLORD / AGENT who chose "business"
const BusinessSchema = new mongoose.Schema({
  businessName:       { type: String, default: '' },
  aboutBusiness:      { type: String, default: '' },
  operatingLocations: { type: [mongoose.Schema.Types.ObjectId], ref: 'Island', default: [] },
  numberOfProperties: { type: Number, default: 0 },
}, { _id: false });


const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    phone:     { type: String, default: '' },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    username:  { type: String },
    dob:       { type: Date,   default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },


    // for social login
    googleId:     { type: String, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },


    role: {
      type: String,
      default: RoleType.USER,
      enum: [RoleType.USER, RoleType.ADMIN, RoleType.LANDLORD, RoleType.AGENT, null],
    },

    // LANDLORD / AGENT only
    entityType: { type: String, enum: ['individual', 'business', null], default: null },
    individual: { type: IndividualSchema, default: null },
    business:   { type: BusinessSchema,   default: null },

    // pending_payment = registered, stripe not yet completed
    // active          = stripe payment confirmed, can login
    // null            = USER (no payment needed)
    accountStatus: {
      type: String,
      enum: ['pending_payment', 'active', 'suspended', null],
      default: null,
    },

    stripeSessionId:   { type: String, default: null },

    // Stored temporarily when cron creates a checkout for a paid downgrade.
    // Frontend reads this to show "Complete your plan downgrade — pay now" banner.
    // Cleared once the user pays (webhook) or cancels.
    stripeCheckoutUrl: { type: String, default: null },

    // ── Active subscription ────────────────────────────────────────────────────
    subscription: {
      planId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
      startDate: { type: Date, default: null },
      endDate:   { type: Date, default: null },
    },

    hasActiveSubscription:  { type: Boolean, default: false },
    subscriptionExpireDate: { type: Date,    default: null },

    // ── Pending subscription change (downgrade / cancel) ──────────────────────
    // Applied automatically by cron when current subscription expires.
    pendingPlan: {
      // "downgrade" = switch to a cheaper plan at expiry
      // "cancel"    = do NOT renew; set hasActiveSubscription = false at expiry
      action:    { type: String, enum: ['downgrade', 'cancel', null], default: null },
      planId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
      createdAt: { type: Date, default: null },
    },

    bio:     { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },

    profileImage:      { type: String,   default: '' },
    multiProfileImage: { type: [String], default: [] },
    pdfFile:           { type: String,   default: '' },

    otp:          { type: String,  default: null },
    otpExpires:   { type: Date,    default: null },
    otpVerified:  { type: Boolean, default: false },
    resetExpires: { type: Date,    default: null },

    isVerified:   { type: Boolean, default: false },
    refreshToken: { type: String,  default: '' },

    searchUsage: {
      used:      { type: Number, default: 0 },
      resetDate: { type: Date,   default: null },
    },

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    language:     { type: String, default: 'en' },
  },
  { timestamps: true }
);


// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const { password: hashedPassword } = await User.findById(id).select('password');
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Generate ACCESS TOKEN
UserSchema.methods.generateAccessToken = function (payload) {
  return jwt.sign(payload, accessTokenSecrete, { expiresIn: accessTokenExpires });
};

// Generate REFRESH TOKEN
UserSchema.methods.generateRefreshToken = function (payload) {
  return jwt.sign(payload, refreshTokenSecrete, { expiresIn: refreshTokenExpires });
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;