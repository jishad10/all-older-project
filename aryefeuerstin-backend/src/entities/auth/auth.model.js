import RoleType from '../../lib/types.js';
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  accessTokenExpires,
  accessTokenSecrete,
  refreshTokenExpires,
  refreshTokenSecrete
} from '../../core/config/config.js';

const AddressSchema = new mongoose.Schema(
  {
    country: { type: String, default: '' },
    cityState: { type: String, default: '' },
    roadArea: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    taxId: { type: String, default: '' }
  },
  { _id: false }
);

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
    location: {
      type: geoPointSchema,
      required: true
    },
    radius: { type: Number, default: 200 } // meters (optional)
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    pickupAddress: { type: String, default: '' },
    username: { type: String },
    dob: { type: Date, default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male'
    },
    role: {
      type: String,
      default: RoleType.USER,
      enum: [RoleType.USER, RoleType.ADMIN, RoleType.DRIVER, RoleType.SUPER_ADMIN]
    },

    //  Driver approval workflow

    driverRequestStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    driverApprovedAt: { type: Date, default: null },
    driverApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    driverRejectedAt: { type: Date, default: null },
    driverRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    driverRejectionReason: { type: String, default: '' },

    stripeAccountId: { type: String, default: null },
    bio: { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },
    profileImage: { type: String, default: '' },
    multiProfileImage: { type: [String], default: [] },
    pdfFile: { type: String, default: '' },
    drivingLicense: { type: String, default: '' },
    location: {
      type: locationSchema,
      default: null
    },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    otpVerified: { type: Boolean, default: false },
    resetExpires: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String, default: '' },

    subscription: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    searchUsage: {
      used: { type: Number, default: 0 },       
      resetDate: { type: Date, default: null },  
    },

    subscriptionUsage: {
      returnOrdersUsed: { type: Number, default: 0 }
    },

    hasActiveSubscription: { type: Boolean, default: false },
    subscriptionExpireDate: { type: Date, default: null },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    language: { type: String, default: 'en' }
  },
  { timestamps: true }
);

// Hashing password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const hashedPassword = await bcrypt.hash(this.password, 10);
  this.password = hashedPassword;
  next();
});

// Password comparison method (bcrypt)
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const { password: hashedPassword } =
    await User.findById(id).select('password');
  const isMatched = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatched;
};

// Generate ACCESS_TOKEN
UserSchema.methods.generateAccessToken = function (payload) {
  return jwt.sign(payload, accessTokenSecrete, {
    expiresIn: accessTokenExpires
  });
};

// Generate REFRESH_TOKEN
UserSchema.methods.generateRefreshToken = function (payload) {
  return jwt.sign(payload, refreshTokenSecrete, {
    expiresIn: refreshTokenExpires
  });
};

UserSchema.index({ 'location.location': '2dsphere' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
