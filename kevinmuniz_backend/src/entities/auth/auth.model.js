import RoleType from '../../lib/types.js';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { accessTokenExpires, accessTokenSecrete, refreshTokenExpires, refreshTokenSecrete } from '../../core/config/config.js';


const AddressSchema = new mongoose.Schema({
  country: { type: String, default: '' },
  cityState: { type: String, default: '' },
  roadArea: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  taxId: { type: String, default: '' }
}, { _id: false });


const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
      enum: [RoleType.USER, RoleType.ADMIN, RoleType.CREATOR],
    },

    stripeAccountId: { type: String, default: null },

    bio: { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },

    profileImage: { type: String, default: '' },
    multiProfileImage: { type: [String], default: [] },
    pdfFile: { type: String, default: '' },

    otp: {
      type: String,
      default: null
    },

    otpExpires: {
      type: Date,
      default: null
    },

    otpVerified : {
      type: Boolean,
      default: false
    },

    resetExpires : {
      type: Date,
      default: null
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
      default: ''
    },

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

    isSuspended: { type: Boolean, default: false },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    language: { type: String, default: 'en' }
  },
  { timestamps: true }
);


// Hashing password
UserSchema.pre("save", async function (next) {

  if (!this.isModified("password")) return next();

  const hashedPassword = await bcrypt.hash(this.password, 10);

  this.password = hashedPassword;
  next();
});

// Password comparison method (bcrypt)
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const { password: hashedPassword } = await User.findById(id).select('password')

  const isMatched = await bcrypt.compare(plainPassword, hashedPassword)

  return isMatched
}

// Generate ACCESS_TOKEN
UserSchema.methods.generateAccessToken = function (payload) {
  return jwt.sign(payload, accessTokenSecrete, { expiresIn: accessTokenExpires });
};

// Generate REFRESH_TOKEN
UserSchema.methods.generateRefreshToken = function (payload) {
  return jwt.sign(payload, refreshTokenSecrete, { expiresIn: refreshTokenExpires });
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;