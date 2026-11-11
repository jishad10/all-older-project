import express from 'express';
import {
  registerUser,
  confirmPayment,
  getRegistrationSession,
  loginUser,
  refreshAccessToken,
  forgetPassword,
  verifyCode,
  resetPassword,
  changePassword,
  logoutUser,
  googleCallback,
  completeGoogleRegister,
} from './auth.controller.js';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import passport from 'passport';

const router = express.Router();

router.post('/register',             registerUser);

// ── Google OAuth ────────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!req.query.code) {
      return res.status(400).json({
        status: false,
        message: 'Invalid request. Do not open this URL directly. Start OAuth from GET /api/v1/auth/google',
      });
    }
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// ── Complete Google registration (role/plan step) ───────────────────────────
router.post('/register/complete-google', completeGoogleRegister);


router.post('/confirm-payment',      confirmPayment);
router.get('/registration-session',  getRegistrationSession);
router.post('/login',                loginUser);
router.post('/refresh-access-token', refreshAccessToken);
router.post('/forget-password',      forgetPassword);
router.post('/verify-code',          verifyCode);
router.post('/reset-password',       resetPassword);
router.post('/change-password',      verifyToken, changePassword);
router.post('/logout',               verifyToken, logoutUser);

export default router;
