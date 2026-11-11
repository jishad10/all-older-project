import { generateResponse } from '../../lib/responseFormate.js';
import User from './auth.model.js';

import {
  registerUserService,
  registerDriverService,
  loginUserService,
  refreshAccessTokenService,
  forgetPasswordService,
  verifyCodeService,
  resetPasswordService,
  changePasswordService
} from './auth.service.js';

export const registerUser = async (req, res, next) => {
  const { firstName, lastName, email, password, phone, pickupAddress } =
    req.body;
  try {
    const data = await registerUserService({
      firstName,
      lastName,
      email,
      password,
      phone,
      pickupAddress
    });
    return generateResponse(
      res,
      201,
      true,
      'Registered user successfully!',
      data
    );
  } catch (error) {
    if (error.message === 'User already registered.') {
      return generateResponse(res, 400, false, 'User already registered', null);
    }
    return next(error);
  }
};


export const registerDriver = async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
 
  } = req.body;

  const drivingLicenseFile = req.files?.drivingLicense?.[0];

  try {
    const data = await registerDriverService({
      firstName,
      lastName,
      email,
      password,
      phone,
      drivingLicenseFile
    });

    return generateResponse(
      res,
      201,
      true,
      'Driver registered successfully!',
      data
    );
  } catch (error) {
    if (error.message === 'User already registered.') {
      return generateResponse(res, 400, false, 'User already registered', null);
    }
    return next(error);
  }
};


export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const data = await loginUserService({ email, password });
    return generateResponse(res, 200, true, 'Login successful', data);
  } catch (error) {
    if (error.message === 'Email and password are required') {
      return generateResponse(
        res,
        400,
        false,
        'Email and password are required',
        null
      );
    }

    if (error.message === 'User not found') {
      return generateResponse(res, 404, false, 'User not found', null);
    }

    if (error.message === 'Invalid password') {
      return generateResponse(res, 400, false, 'Invalid password', null);
    }

    // ✅ DRIVER APPROVAL ERROR
    if (error.message === 'Driver not approved') {
      return generateResponse(
        res,
        403,
        false,
        'Your driver account is pending admin approval',
        null
      );
    }

    return next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    const tokens = await refreshAccessTokenService(refreshToken);
    return generateResponse(res, 200, true, 'Token refreshed', tokens);
  } catch (error) {
    if (error.message === 'No refresh token provided') {
      return generateResponse(
        res,
        400,
        false,
        'No refresh token provided',
        null
      );
    }
    if (error.message === 'Invalid refresh token') {
      return generateResponse(res, 400, false, 'Invalid refresh token', null);
    }
    return next(error);
  }
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    await forgetPasswordService(email);
    return generateResponse(
      res,
      200,
      true,
      'Verification code sent to your email',
      null
    );
  } catch (error) {
    if (error.message === 'Email is required') {
      return generateResponse(res, 400, false, 'Email is required', null);
    }
    if (error.message === 'Invalid email') {
      return generateResponse(res, 400, false, 'Invalid email', null);
    }
    return next(error);
  }
};

export const verifyCode = async (req, res, next) => {
  const { otp, email } = req.body;
  try {
    await verifyCodeService({ otp, email });
    return generateResponse(res, 200, true, 'Verification successful', null);
  } catch (error) {
    if (error.message === 'Email and otp are required') {
      return generateResponse(
        res,
        400,
        false,
        'Email and otp is required',
        null
      );
    }
    if (error.message === 'Invalid email') {
      return generateResponse(res, 400, false, 'Invalid email', null);
    }
    if (error.message === 'Otp not found') {
      return generateResponse(res, 404, false, 'Otp not found', null);
    }
    if (error.message === 'Invalid or expired otp') {
      return generateResponse(res, 403, false, 'Invalid or expired otp', null);
    }
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  try {
    await resetPasswordService({ email, newPassword });
    return generateResponse(
      res,
      200,
      true,
      'Password reset successfully',
      null
    );
  } catch (error) {
    if (error.message === 'Email and new password are required') {
      return generateResponse(
        res,
        400,
        false,
        'Email and new password are required',
        null
      );
    }
    if (error.message === 'Invalid email') {
      return generateResponse(res, 400, false, 'Invalid email', null);
    }
    if (error.message === 'otp not cleared') {
      return generateResponse(res, 403, false, 'otp not cleared', null);
    }
    if (error.message === 'Reset session expired') {
      return generateResponse(res, 403, false, 'Reset session expired', null);
    }
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?._id;

  try {
    await changePasswordService({ userId, oldPassword, newPassword });
    return generateResponse(
      res,
      200,
      true,
      'Password changed successfully',
      null
    );
  } catch (error) {
    if (
      error.message === 'User id, old password and new password are required'
    ) {
      return generateResponse(res, 400, false, error.message, null);
    }
    if (error.message === 'User not found') {
      return generateResponse(res, 404, false, 'User not found', null);
    }
    if (error.message === 'Invalid old password') {
      return generateResponse(res, 400, false, 'Invalid old password', null);
    }
    return next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  const userId = req.user?._id;
  try {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return generateResponse(res, 200, true, 'Logged out successfully', null);
  } catch (error) {
    return next(error);
  }
};
