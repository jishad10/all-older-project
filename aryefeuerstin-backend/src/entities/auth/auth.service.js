import User from './auth.model.js';
import jwt from 'jsonwebtoken';
import { refreshTokenSecrete, accessTokenSecrete, emailExpires, accessTokenExpires, refreshTokenExpires } from '../../core/config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';
import { welcomeEmailTemplate } from '../../lib/authEmail.js';
import RoleType from '../../lib/types.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import Team from '../team/team.model.js';
import bcrypt from "bcrypt";

// USER Register
export const registerUserService = async ({ firstName, lastName, email, password, phone, pickupAddress }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User already registered.');

  const newUser = new User({ firstName, lastName, email, password, phone, pickupAddress });
  const user = await newUser.save();

  // Send welcome email (non-blocking for main flow)
  try {
    if (email) {
      const html = welcomeEmailTemplate({ firstName, lastName });
      await sendEmail({
        to: email,
        subject: 'Thanks for signing up',
        html,
      });
    }
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
  }

  const { _id, role, profileImage, drivingLicense } = user;
  return { _id, firstName, lastName, email, phone, pickupAddress, role, profileImage, drivingLicense };
};

// DRIVER Register
export const registerDriverService = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  drivingLicenseFile
}) => {
  // check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already registered.');
  }

  // // validate location
  // if (
  //   !location ||
  //   typeof location.lat !== 'number' ||
  //   typeof location.lng !== 'number' ||
  //   !location.address
  // ) {
  //   throw new Error('Driver location is required.');
  // }

  // driving license required
  if (!drivingLicenseFile) {
    throw new Error('Driving license is required.');
  }

  // upload to cloudinary
  const uploadResult = await cloudinaryUpload(
    drivingLicenseFile.path,
    `driver-license-${Date.now()}`,
    'drivers/licenses'
  );

  if (!uploadResult?.secure_url) {
    throw new Error('Driving license upload failed.');
  }

  // format geo location
  // const formattedLocation = {
  //   address: location.address,
  //   lat: location.lat,
  //   lng: location.lng,
  //   location: {
  //     type: 'Point',
  //     coordinates: [location.lng, location.lat]
  //   }
  // };

  // create driver
  const newDriver = new User({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: RoleType.DRIVER,
    driverRequestStatus: 'PENDING',
 

    // store only URL (matches schema)
    drivingLicense: uploadResult.secure_url
  });

  const driver = await newDriver.save();

  // Send welcome email (non-blocking)
  try {
    if (email) {
      const html = welcomeEmailTemplate({ firstName, lastName });
      await sendEmail({
        to: email,
        subject: 'Thanks for signing up',
        html,
      });
    }
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
  }

  return {
    _id: driver._id,
    firstName,
    lastName,
    email,
    phone,
    role: driver.role,
    driverRequestStatus: driver.driverRequestStatus,
    drivingLicense: driver.drivingLicense,
  };
};


export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error("Email and password are required");

  let account = null;
  let accountType = null;

  // --- CHECK USER MODEL (USER + SUPER_ADMIN) ---
  account = await User.findOne({ email })
    .select("+password")
    .populate("subscription.planId");

  if (account) {
    if (account.role === "SUPER_ADMIN") accountType = "SUPER_ADMIN";
    else if (account.role === "USER") accountType = "USER";
    else if (account.role === "DRIVER") accountType = "DRIVER";
    else accountType = "ADMIN";
  }

  // --- CHECK TEAM MODEL (ADMIN) ---
  if (!account) {
    account = await Team.findOne({ email }).select("+password");
    if (account) accountType = "ADMIN";
  }

  if (!account) throw new Error("User not found");

  // PASSWORD VALIDATION
  const isMatch = await bcrypt.compare(password, account.password);
  if (!isMatch) throw new Error("Invalid password");
    // Block drivers until approved
  if (accountType === "DRIVER" && account.driverRequestStatus !== "APPROVED") {
    throw new Error("Driver not approved");
  }

  // JWT PAYLOAD
  const payload = {
    _id: account._id,
    role: accountType,
    permissions: accountType === "ADMIN" ? account.permissions : [],
  };

  // TOKENS
  const accessToken = jwt.sign(payload, accessTokenSecrete, {
    expiresIn: accessTokenExpires,
  });

  const refreshToken = jwt.sign(payload, refreshTokenSecrete, {
    expiresIn: refreshTokenExpires,
  });

  // SAVE REFRESH TOKEN FOR USER + SUPER_ADMIN
  if (accountType === "USER" || accountType === "SUPER_ADMIN") {
    account.refreshToken = refreshToken;
    await account.save();
  }

  // RESPONSE (role-based)
  let responseUser = {
    _id: account._id,
    email: account.email,
    role: accountType,
  };

  // USER + SUPER_ADMIN RESPONSE FORMAT
  if (accountType === "USER" || accountType === "SUPER_ADMIN" || accountType === "DRIVER") {
    responseUser.firstName = account.firstName;
    responseUser.lastName = account.lastName;
    responseUser.profileImage = account.profileImage || "";
    responseUser.subscription = account.subscription || {};
    responseUser.subscriptionUsage = account.subscriptionUsage || {};
    responseUser.hasActiveSubscription = !!account.hasActiveSubscription;
    responseUser.subscriptionExpireDate = account.subscriptionExpireDate;
  }

  // ADMIN RESPONSE FORMAT
  if (accountType === "ADMIN") {
    responseUser.name = account.name;
    responseUser.permissions = account.permissions || [];
  }

  return {
    user: responseUser,
    accessToken,
    refreshToken,
  };
};


// export const loginUserService = async ({ email, password }) => {
//   if (!email || !password) {
//     throw new Error('Email and password are required');
//   }

//   const user = await User.findOne({ email }).select(
//     '_id firstName lastName email role profileImage drivingLicense driverRequestStatus'
//   );
//   if (!user) {
//     throw new Error('User not found');
//   }

//   // ✅ BLOCK DRIVER LOGIN UNTIL ADMIN APPROVAL
//   if (
//     user.role === RoleType.DRIVER &&
//     user.driverRequestStatus !== 'APPROVED'
//   ) {
//     throw new Error('Driver not approved');
//   }

//   const isMatch = await user.comparePassword(user._id, password);
//   if (!isMatch) {
//     throw new Error('Invalid password');
//   }

//   const payload = { _id: user._id, role: user.role };

//   const data = {
//     user,
//     accessToken: user.generateAccessToken(payload)
//   };

//   user.refreshToken = user.generateRefreshToken(payload);
//   await user.save({ validateBeforeSave: false });

//   return data;
// };

// (rest of the file stays as in your current version)

export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete);

  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token');

  const payload = { _id: user._id, role: user.role };

  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const forgetPasswordService = async (email) => {
  if (!email) throw new Error('Email is required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  user.otpVerified = false;
  user.resetExpires = null;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp),
  });

  return;
};

export const verifyCodeService = async ({ email, otp }) => {
  if (!email || !otp) throw new Error('Email and otp are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (
    parseInt(user.otp, 10) !== parseInt(otp, 10) ||
    Date.now() > user.otpExpires.getTime()
  ) {
    throw new Error('Invalid or expired otp');
  }

  user.otp = null;
  user.otpExpires = null;
  user.otpVerified = true;
  user.resetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await user.save({ validateBeforeSave: false });

  return;
};

export const resetPasswordService = async ({ email, newPassword }) => {
  if (!email || !newPassword) throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (!user.otpVerified || !user.resetExpires) {
    throw new Error('otp not cleared');
  }

  if (Date.now() > user.resetExpires.getTime()) {
    throw new Error('Reset session expired');
  }

  user.password = newPassword;
  user.otpVerified = false;
  user.resetExpires = null;

  await user.save();

  return;
};

export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  if (!userId || !oldPassword || !newPassword)
    throw new Error('User id, old password and new password are required');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(userId, oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();

  return;
};
