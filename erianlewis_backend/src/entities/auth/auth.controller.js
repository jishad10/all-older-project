import jwt from 'jsonwebtoken';
import { clientUrl, accessTokenSecrete } from '../../core/config/config.js';
import { generateResponse } from '../../lib/responseFormate.js';
import User from './auth.model.js';
import {
  registerUserService,
  confirmPaymentService,
  getRegistrationSessionService,
  loginUserService,
  refreshAccessTokenService,
  forgetPasswordService,
  verifyCodeService,
  resetPasswordService,
  changePasswordService,
  completeGoogleRegisterService,
} from './auth.service.js';


const CLIENT_ERRORS = [
  'First name and last name are required',
  'Email and password are required',
  'Passwords do not match',
  'User already registered',
  'Invalid role',
  'Entity type is required for Landlord or Agent',
  'Entity type must be individual or business',
  'Agents must register as a business entity',
  'Operating location is required',
  'Number of properties is required',
  'Business name is required',
  'Plan is required for Landlord or Agent',
  'Plan not found',
  'Selected plan is not active',
  'Selected plan is not valid for your role',
];


export const registerUser = async (req, res, next) => {
  try {
    const data = await registerUserService(req.body);
    return generateResponse(res, 201, true, 'Registered successfully', data);
  } catch (error) {
    if (CLIENT_ERRORS.includes(error.message)) {
      return generateResponse(res, 400, false, error.message, null);
    }
    next(error);
  }
};


// ── Google callback ─────────────────────────────────────────────────────────
export const googleCallback = (req, res) => {
  const { user, isNew } = req.user; // set by passport strategy

  if (!isNew) {
    // Existing user — issue real tokens, redirect to dashboard
    const accessToken = user.generateAccessToken({ _id: user._id, role: user.role });
    return res.redirect(`${clientUrl}/auth/google/success?token=${accessToken}&isNew=false`);
  }

  // New user — issue a short-lived TEMP token for the role/plan step
  const tempToken = jwt.sign(
    { _id: user._id, purpose: 'complete-registration' },
    accessTokenSecrete,
    { expiresIn: '30m' }
  );

  return res.redirect(`${clientUrl}/register/complete?tempToken=${tempToken}`);
};


// ── Complete Google registration ────────────────────────────────────────────
export const completeGoogleRegister = async (req, res, next) => {
  try {
    const data = await completeGoogleRegisterService(req.body);
    return generateResponse(res, 200, true, 'Registration completed', data);
  } catch (error) {
    if (CLIENT_ERRORS.includes(error.message))
      return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


// Manual confirm payment — for testing in Postman without real Stripe webhook
export const confirmPayment = async (req, res, next) => {
  try {
    const { userId, stripeSessionId } = req.body;
    if (!userId) return generateResponse(res, 400, false, 'userId is required', null);

    const data = await confirmPaymentService({ userId, stripeSessionId });
    return generateResponse(res, 200, true, 'Payment confirmed. Account is now active.', data);
  } catch (error) {
    if (error.message === 'User not found')         return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Account already active') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Plan not found on user') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await loginUserService({ email, password });
    return generateResponse(res, 200, true, 'Login successful', data);
  } catch (error) {
    if (error.message === 'Email and password are required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'User not found')                  return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Invalid password')                return generateResponse(res, 400, false, error.message, null);
    if (error.message.includes('Payment pending'))           return generateResponse(res, 403, false, error.message, null);
    if (error.message.includes('suspended'))                 return generateResponse(res, 403, false, error.message, null);
    next(error);
  }
};


export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await refreshAccessTokenService(refreshToken);
    return generateResponse(res, 200, true, 'Token refreshed', tokens);
  } catch (error) {
    if (error.message === 'No refresh token provided') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Invalid refresh token')     return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const forgetPassword = async (req, res, next) => {
  try {
    await forgetPasswordService(req.body.email);
    return generateResponse(res, 200, true, 'Verification code sent to your email', null);
  } catch (error) {
    if (error.message === 'Email is required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Invalid email')     return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const verifyCode = async (req, res, next) => {
  try {
    const { otp, email } = req.body;
    const data = await verifyCodeService({ otp, email });
    return generateResponse(res, 200, true, 'Verification successful', data);
  } catch (error) {
    if (error.message === 'Email and otp are required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Invalid email')              return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Otp not found')              return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Invalid or expired otp')     return generateResponse(res, 403, false, error.message, null);
    next(error);
  }
};


export const getRegistrationSession = async (req, res, next) => {
  try {
    const stripeSessionId = req.query.session_id || req.query.stripeSessionId;
    const data = await getRegistrationSessionService({ stripeSessionId });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    return generateResponse(res, 200, true, 'Registration session fetched successfully', data);
  } catch (error) {
    if (error.message === 'stripeSessionId is required') {
      return generateResponse(res, 400, false, error.message, null);
    }
    if (error.message === 'Registration session not found') {
      return generateResponse(res, 404, false, error.message, null);
    }
    next(error);
  }
};


export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    await resetPasswordService({ email, newPassword });
    return generateResponse(res, 200, true, 'Password reset successfully', null);
  } catch (error) {
    if (error.message === 'Email and new password are required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Invalid email')                       return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'otp not cleared')                     return generateResponse(res, 403, false, error.message, null);
    if (error.message === 'Reset session expired')               return generateResponse(res, 403, false, error.message, null);
    next(error);
  }
};


export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await changePasswordService({ userId: req.user._id, oldPassword, newPassword });
    return generateResponse(res, 200, true, 'Password changed successfully', null);
  } catch (error) {
    if (error.message === 'Invalid old password') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'New password must be different from old password') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const logoutUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return generateResponse(res, 200, true, 'Logged out successfully', null);
  } catch (error) {
    next(error);
  }
};
