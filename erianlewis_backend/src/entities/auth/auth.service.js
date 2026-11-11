import User from './auth.model.js';
import Plan from '../plan/plan.model.js';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { refreshTokenSecrete, emailExpires, stripeSecretKey, clientUrl, accessTokenSecrete } from '../../core/config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate, { getSubscriptionPaymentConfirmationTemplate } from '../../lib/emailTemplates.js';
import RoleType from '../../lib/types.js';

const stripe = new Stripe(stripeSecretKey);
const PAID_ROLES = [RoleType.LANDLORD, RoleType.AGENT];

const sendSubscriptionPaymentConfirmationEmail = async ({
  user,
  plan,
  stripeSessionId,
  amount,
  currency = 'USD',
  paymentDate,
  subscriptionStartDate,
  subscriptionEndDate,
}) => {
  try {
    await sendEmail({
      to: user.email,
      subject: 'Payment successful - your subscription is now active',
      html: getSubscriptionPaymentConfirmationTemplate({
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there',
        accountRole: user.role || 'Account',
        planName: plan?.title || plan?.name || 'Subscription plan',
        billingCycle: plan?.billingCycle
          ? `${plan.billingCycle.charAt(0).toUpperCase()}${plan.billingCycle.slice(1)}`
          : 'Subscription',
        amount,
        currency,
        stripeSessionId,
        paymentDate,
        subscriptionStartDate,
        subscriptionEndDate,
      }),
    });
  } catch (error) {
    console.error('[PaymentEmail] Failed to send confirmation email:', error.message);
  }
};


// ── registerUserService — add OTP send for manual, skip for google ──────────
export const registerUserService = async (payload) => {
  const { firstName, lastName, phone, email, password, confirmPassword,
          role = RoleType.USER, entityType, individual, business, planId } = payload;

  if (!firstName || !lastName) throw new Error('First name and last name are required');
  if (!email || !password)     throw new Error('Email and password are required');
  if (password !== confirmPassword) throw new Error('Passwords do not match');

  const allowedRoles = [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT];
  if (!allowedRoles.includes(role)) throw new Error('Invalid role');

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User already registered');

  const isPaidRole = PAID_ROLES.includes(role);

  // ── USER ────────────────────────────────────────────────────────────────────
  if (!isPaidRole) {
    const newUser = await new User({
      firstName, lastName, phone, email, password,
      role,
      authProvider:  'local',
      accountStatus: 'active',
      isVerified:    false,
    }).save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    newUser.otp        = otp;
    newUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await newUser.save();

    await sendEmail({
      to:      email,
      subject: 'Verify your email — OTP',
      html:    `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });        // your existing helper

    return {
      _id: newUser._id, firstName, lastName, email,
      role: newUser.role,
      requiresOtp:     true,
      requiresPayment: false,
    };
  }

  // ── LANDLORD / AGENT — same validation as before ────────────────────────────
  if (!entityType) throw new Error('Entity type is required for Landlord or Agent');
  if (!['individual', 'business'].includes(entityType))
    throw new Error('Entity type must be individual or business');
  if (role === RoleType.AGENT && entityType !== 'business')
    throw new Error('Agents must register as a business entity');

  if (entityType === 'individual') {
    if (!individual?.operatingLocations?.length) throw new Error('Operating location is required');
    if (individual?.numberOfProperties == null)  throw new Error('Number of properties is required');
  }
  if (entityType === 'business') {
    if (!business?.businessName)                 throw new Error('Business name is required');
    if (!business?.operatingLocations?.length)   throw new Error('Operating location is required');
    if (business?.numberOfProperties == null)    throw new Error('Number of properties is required');
  }

  if (!planId) throw new Error('Plan is required for Landlord or Agent');
  const plan = await Plan.findById(planId);
  if (!plan)                    throw new Error('Plan not found');
  if (plan.status !== 'active') throw new Error('Selected plan is not active');

  const newUser = await new User({
    firstName, lastName, phone, email, password,
    role,
    authProvider:  'local',
    accountStatus: 'pending_payment',
    isVerified:    false,
    entityType,
    individual: entityType === 'individual' ? individual : null,
    business:   entityType === 'business'   ? business   : null,
    subscription: { planId },
  }).save();

  // Send OTP — user must verify email BEFORE Stripe
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  newUser.otp        = otp;
  newUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await newUser.save();

  await sendEmail({
    to:      email,
    subject: 'Verify your email — OTP',
    html:    `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });

  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(plan.price * 100),
        product_data: {
          name: plan.title || plan.name,
          description: `${plan.billingCycle} plan — up to ${plan.maxProperties ?? 'unlimited'} properties`,
        },
      },
      quantity: 1,
    }],
    metadata: { userId: newUser._id.toString(), planId: plan._id.toString() },
    success_url: `${clientUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${clientUrl}/register/cancelled`,
  });

  newUser.stripeSessionId  = session.id;
  newUser.stripeCheckoutUrl = session.url;
  await newUser.save();

  return {
    _id: newUser._id, firstName, lastName, email,
    role:            newUser.role,
    requiresOtp:     true,       // ← verify email first
    requiresPayment: true,
    stripeUrl:       session.url, // frontend uses this after OTP is verified
  };
};


// ── completeGoogleRegisterService ───────────────────────────────────────────
export const completeGoogleRegisterService = async (payload) => {
  const { tempToken, role, entityType, individual, business, planId } = payload;

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(tempToken, accessTokenSecrete);
  } catch {
    throw new Error('Invalid or expired session. Please sign in with Google again.');
  }

  if (decoded.purpose !== 'complete-registration')
    throw new Error('Invalid token purpose');

  const user = await User.findById(decoded._id);
  if (!user) throw new Error('User not found');
  if (user.role) throw new Error('Registration already completed');  // prevent re-submit

  // Role validation
  const allowedRoles = [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT];
  if (!allowedRoles.includes(role)) throw new Error('Invalid role');

  const isPaidRole = PAID_ROLES.includes(role);

  // ── USER ──────────────────────────────────────────────────────────────────
  if (!isPaidRole) {
    user.role          = role;
    user.accountStatus = 'active';
    await user.save();

    const accessToken = user.generateAccessToken({ _id: user._id, role: user.role });
    return { accessToken, requiresPayment: false };
  }

  // ── LANDLORD / AGENT ──────────────────────────────────────────────────────
  if (!entityType) throw new Error('Entity type is required');
  if (!['individual', 'business'].includes(entityType))
    throw new Error('Entity type must be individual or business');
  if (role === RoleType.AGENT && entityType !== 'business')
    throw new Error('Agents must register as a business entity');

  if (entityType === 'individual') {
    if (!individual?.operatingLocations?.length) throw new Error('Operating location is required');
    if (individual?.numberOfProperties == null)  throw new Error('Number of properties is required');
  }
  if (entityType === 'business') {
    if (!business?.businessName)                 throw new Error('Business name is required');
    if (!business?.operatingLocations?.length)   throw new Error('Operating location is required');
    if (business?.numberOfProperties == null)    throw new Error('Number of properties is required');
  }

  if (!planId) throw new Error('Plan is required');
  const plan = await Plan.findById(planId);
  if (!plan)                    throw new Error('Plan not found');
  if (plan.status !== 'active') throw new Error('Selected plan is not active');

  user.role          = role;
  user.entityType    = entityType;
  user.individual    = entityType === 'individual' ? individual : null;
  user.business      = entityType === 'business'   ? business   : null;
  user.accountStatus = 'pending_payment';
  user.subscription  = { planId };
  await user.save();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(plan.price * 100),
        product_data: {
          name: plan.title || plan.name,
          description: `${plan.billingCycle} plan — up to ${plan.maxProperties ?? 'unlimited'} properties`,
        },
      },
      quantity: 1,
    }],
    metadata: { userId: user._id.toString(), planId: plan._id.toString() },
    success_url: `${clientUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${clientUrl}/register/cancelled`,
  });

  user.stripeSessionId = session.id;
  await user.save();

  return {
    requiresPayment: true,
    stripeUrl:       session.url,
  };
};














// old


/**
 * REGISTER
 * USER          → saved as active, can login immediately
 * LANDLORD/AGENT → saved as pending_payment, returns stripeUrl
 */
// export const registerUserService = async (payload) => {
//   const {
//     firstName, lastName, phone, email,
//     password, confirmPassword,
//     role = RoleType.USER,
//     planId, entityType, individual, business,
//   } = payload;

//   if (!firstName || !lastName)      throw new Error('First name and last name are required');
//   if (!email || !password)          throw new Error('Email and password are required');
//   if (password !== confirmPassword) throw new Error('Passwords do not match');

//   const allowedRoles = [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT];
//   if (!allowedRoles.includes(role)) throw new Error('Invalid role');

//   const existingUser = await User.findOne({ email });
//   if (existingUser)                 throw new Error('User already registered');

//   const isPaidRole = PAID_ROLES.includes(role);
//   let plan = null;

//   if (isPaidRole) {
//     if (!planId)     throw new Error('Plan is required for Landlord or Agent');
//     if (!entityType) throw new Error('Entity type is required for Landlord or Agent');
//     if (!['individual', 'business'].includes(entityType)) {
//       throw new Error('Entity type must be individual or business');
//     }

//     plan = await Plan.findById(planId);
//     if (!plan)                    throw new Error('Plan not found');
//     if (plan.status !== 'active') throw new Error('Selected plan is not active');

//     if (entityType === 'individual') {
//       if (!individual?.operatingLocations?.length) throw new Error('Operating location is required');
//       if (individual?.numberOfProperties == null)  throw new Error('Number of properties is required');
//     }

//     if (entityType === 'business') {
//       if (!business?.businessName)               throw new Error('Business name is required');
//       if (!business?.operatingLocations?.length) throw new Error('Operating location is required');
//       if (business?.numberOfProperties == null)  throw new Error('Number of properties is required');
//     }
//   }

//   // Save user to DB
//   const newUser = new User({
//     firstName, lastName, phone, email, password, role,
//     accountStatus: isPaidRole ? 'pending_payment' : 'active',
//     entityType:    isPaidRole ? entityType : null,
//     individual:    isPaidRole && entityType === 'individual' ? individual : null,
//     business:      isPaidRole && entityType === 'business'   ? business   : null,
//     subscription:  isPaidRole ? { planId } : {},
//   });

//   const user = await newUser.save();

//   // USER — done, no payment needed
//   if (!isPaidRole) {
//     return {
//       _id: user._id, firstName, lastName, phone, email,
//       role: user.role,
//       accountStatus: user.accountStatus,
//       requiresPayment: false,
//     };
//   }

//   // LANDLORD / AGENT — create Stripe checkout session
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'payment',
//     customer_email: email,
//     line_items: [
//       {
//         price_data: {
//           currency: 'usd',
//           unit_amount: Math.round(plan.price * 100),
//           product_data: {
//             name: plan.title || plan.name,
//             description: `${plan.billingCycle} subscription — up to ${plan.maxProperties ?? 'unlimited'} properties`,
//           },
//         },
//         quantity: 1,
//       },
//     ],
//     metadata: {
//       userId: user._id.toString(),
//       planId: plan._id.toString(),
//     },
//     success_url: `${clientUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url:  `${clientUrl}/register/cancelled`,
//   });

//   return {
//     _id: user._id, firstName, lastName, phone, email,
//     role:            user.role,
//     accountStatus:   user.accountStatus,
//     requiresPayment: true,
//     stripeUrl:       session.url,
//   };
// };


/**
 * CONFIRM PAYMENT
 * Called by Stripe webhook → activates account + stores full plan info
 */
export const confirmPaymentService = async ({ userId, stripeSessionId }) => {
  const user = await User.findById(userId).populate('subscription.planId');
  if (!user) throw new Error('User not found');

  if (user.accountStatus === 'active') throw new Error('Account already active');

  const plan = user.subscription?.planId;
  if (!plan) throw new Error('Plan not found on user');

  const now = new Date();
  let endDate = null;

  if (plan.billingCycle === 'monthly') {
    endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (plan.billingCycle === 'yearly') {
    endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  user.accountStatus          = 'active';
  user.hasActiveSubscription  = true;
  user.stripeSessionId        = stripeSessionId || null;
  user.subscription.startDate = now;
  user.subscription.endDate   = endDate;
  user.subscriptionExpireDate = endDate;

  await user.save({ validateBeforeSave: false });

  let stripeSession = null;
  if (stripeSessionId) {
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
    } catch (error) {
      console.error('[PaymentEmail] Unable to retrieve Stripe session:', error.message);
    }
  }

  const updatedUser = await User.findById(userId).populate('subscription.planId');

  // Generate tokens so frontend can auto-login after payment
  const payload      = { _id: updatedUser._id, role: updatedUser.role };
  const accessToken  = updatedUser.generateAccessToken(payload);
  const refreshToken = updatedUser.generateRefreshToken(payload);

  updatedUser.refreshToken = refreshToken;
  await updatedUser.save({ validateBeforeSave: false });

  await sendSubscriptionPaymentConfirmationEmail({
    user: updatedUser,
    plan,
    stripeSessionId: stripeSessionId || updatedUser.stripeSessionId,
    amount: typeof stripeSession?.amount_total === 'number' ? stripeSession.amount_total / 100 : plan?.price,
    currency: stripeSession?.currency || 'USD',
    paymentDate: stripeSession?.created ? new Date(stripeSession.created * 1000) : now,
    subscriptionStartDate: updatedUser.subscription.startDate,
    subscriptionEndDate: updatedUser.subscription.endDate,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      _id:                   updatedUser._id,
      email:                 updatedUser.email,
      role:                  updatedUser.role,
      accountStatus:         updatedUser.accountStatus,
      hasActiveSubscription: updatedUser.hasActiveSubscription,
      subscription: {
        plan: {
          _id:             plan._id,
          name:            plan.name,
          title:           plan.title,
          price:           plan.price,
          billingCycle:    plan.billingCycle,
          maxProperties:   plan.maxProperties,
          displayFeatures: plan.displayFeatures,
        },
        startDate: updatedUser.subscription.startDate,
        endDate:   updatedUser.subscription.endDate,
      },
    },
  };
};

export const getRegistrationSessionService = async ({ stripeSessionId }) => {
  if (!stripeSessionId) throw new Error('stripeSessionId is required');

  let user = await User.findOne({ stripeSessionId })
    .populate('subscription.planId')
    .select('_id firstName lastName email role profileImage accountStatus hasActiveSubscription subscription refreshToken stripeSessionId');

  if (!user) throw new Error('Registration session not found');

  if (user.accountStatus !== 'active') {
    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);

    if (stripeSession?.payment_status === 'paid') {
      await confirmPaymentService({
        userId: user._id,
        stripeSessionId,
      });

      user = await User.findById(user._id)
        .populate('subscription.planId')
        .select('_id firstName lastName email role profileImage accountStatus hasActiveSubscription subscription refreshToken stripeSessionId');
    }
  }

  if (user.accountStatus !== 'active') {
    return {
      isReady: false,
      accountStatus: user.accountStatus,
    };
  }

  const payload = { _id: user._id, role: user.role };
  const accessToken = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    isReady: true,
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      accountStatus: user.accountStatus,
      hasActiveSubscription: user.hasActiveSubscription,
    },
  };
};


/**
 * LOGIN — blocks pending_payment accounts
 */
// export const loginUserService = async ({ email, password }) => {
//   if (!email || !password) throw new Error('Email and password are required');

//   const user = await User.findOne({ email })
//     .select('_id firstName lastName email role profileImage accountStatus password');

//   if (!user) throw new Error('User not found');

//   const isMatch = await user.comparePassword(user._id, password);
//   if (!isMatch) throw new Error('Invalid password');

//   if (user.accountStatus === 'pending_payment') {
//     throw new Error('Payment pending. Please complete your subscription to login');
//   }

//   if (user.accountStatus === 'suspended') {
//     throw new Error('Your account has been suspended. Please contact support.');
//   }

//   const payload      = { _id: user._id, role: user.role };
//   const accessToken  = user.generateAccessToken(payload);
//   const refreshToken = user.generateRefreshToken(payload);

//   user.refreshToken = refreshToken;
//   await user.save({ validateBeforeSave: false });

//   return {
//     user: {
//       _id: user._id, firstName: user.firstName, lastName: user.lastName,
//       email: user.email, role: user.role, profileImage: user.profileImage,
//     },
//     accessToken,
//     refreshToken,
//   };
// };


export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email })
    .select('_id firstName lastName email role profileImage accountStatus password');

  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(user._id, password);
  if (!isMatch) throw new Error('Invalid password');

  if (user.accountStatus === 'pending_payment') {
    throw new Error('Payment pending. Please complete your subscription to login');
  }

  if (user.accountStatus === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.');
  }

  const payload      = { _id: user._id, role: user.role };
  const accessToken  = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      _id: user._id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, role: user.role, profileImage: user.profileImage,
    },
    accessToken,
    refreshToken,
  };
};


/**
 * REFRESH ACCESS TOKEN
 */
export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete);
  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token');

  const payload         = { _id: user._id, role: user.role };
  const accessToken     = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};


/**
 * FORGET PASSWORD
 */
export const forgetPasswordService = async (email) => {
  if (!email) throw new Error('Email is required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp        = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp; user.otpExpires = otpExpires;
  user.otpVerified = false; user.resetExpires = null;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email, subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp),
  });
};


/**
 * VERIFY OTP
 */
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

  user.otp = null; user.otpExpires = null;
  user.otpVerified = true;
  user.resetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  if (user.accountStatus !== 'active') {
    return {
      user: {
        _id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, accountStatus: user.accountStatus,
      },
    };
  }

  const payload      = { _id: user._id, role: user.role };
  const accessToken  = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, role: user.role, accountStatus: user.accountStatus,
    },
  };
};


/**
 * RESET PASSWORD
 */
export const resetPasswordService = async ({ email, newPassword }) => {
  if (!email || !newPassword) throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (!user.otpVerified || !user.resetExpires) throw new Error('otp not cleared');
  if (Date.now() > user.resetExpires.getTime()) throw new Error('Reset session expired');

  user.password = newPassword;
  user.otpVerified = false;
  user.resetExpires = null;

  await user.save();
};


/**
 * CHANGE PASSWORD
 */
export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  if (!userId || !oldPassword || !newPassword) {
    throw new Error('User id, old password and new password are required');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new Error('Invalid old password');

  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) throw new Error('New password must be different from old password');

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
};
