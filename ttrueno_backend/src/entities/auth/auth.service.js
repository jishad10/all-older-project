import User from './auth.model.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';
import { OAuth2Client } from 'google-auth-library';
import {accessTokenSecrete,emailExpires, accessTokenExpires, refreshTokenSecrete, refreshTokenExpires,  } from '../../core/config/config.js';
import axios from 'axios';
import { verifyAppleToken } from '../../lib/apple_verification.js';

//Google setup
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);


export const initiateRegisterUserService = async ({ name, phoneNumber, email, password }) => {
  const existingUser = await User.findOne({ email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

  if (existingUser) {
    if (existingUser.isVerified) {
      throw new Error('User already verified');
    }

    // User exists but not verified → update OTP
    existingUser.otp = otp;
    existingUser.otpExpires = otpExpires;
    existingUser.name = name; 
    existingUser.phoneNumber = phoneNumber;
    existingUser.password = password; 
    await existingUser.save();
  } 
  else {
    const newUser = new User({
      name,
      phoneNumber,
      email,
      password,
      otp,
      otpExpires
    });
    await newUser.save();
  }

  await sendEmail({
    to: email,
    subject: 'Your OTP Code',
    html: `<p>Your verification code is: <strong>${otp}</strong></p>`
  });
};


export const verifyRegisterOTPService = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('User already verified');
  if (user.otp !== otp) throw new Error('Invalid OTP');
  if (user.otpExpires < new Date()) throw new Error('OTP expired');

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await user.save();

  const { _id, role, profileImage, name, phoneNumber } = user;
  return { _id, email, role, profileImage, name, phoneNumber };
};


export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email }).select("_id name email role profileImage password isVerified refreshToken updatedAt");

  if (!user) throw new Error('User not found');
  if (!user.isVerified) throw new Error('Please verify your email before logging in');

  const isMatch = await user.comparePassword(user._id, password);
  if (!isMatch) throw new Error('Invalid password');

  const payload = { _id: user._id, role: user.role };

  const accessToken = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      refreshToken,
      updatedAt: user.updatedAt,
    },
    accessToken
  };
};


/// Note:: Needs testing... >>> Works seamlessly.
export const googleLoginService = async (idToken) => {
  if (!idToken) throw new Error('Missing idToken');

  // Verify ID token...
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payloadResponse = ticket.getPayload(); // contains email, sub, name, picture
  const email = payloadResponse.email;
  const providerId = payloadResponse.sub;
  const name = payloadResponse.name;
  const picture = payloadResponse.picture;
  let user = await User.findOne({ provider: 'google', email }).select("_id name email role profileImage password isVerified refreshToken updatedAt");
  // If user is null, means user is registering with google provider.
  // Register
  if (!user && email != null) {
    if(await User.findOne({ email })) throw new Error('User already exists!');
    const newUser = new User({
      provider: 'google',
      providerId: providerId,
      name,
      // phoneNumber,
      email,
      profileImage: picture,
      // Since Provider is Google, user is automatically [verified]
      isVerified: true
      // password,
      // otp,
      // otpExpires
    });
    await newUser.save();
    user = await User.findOne({ provider: 'google', email }).select("_id name email role profileImage password isVerified refreshToken updatedAt");
  } 
  // This part is similar to general email-password login...
  const payload = { _id: user._id, role: user.role };

  const accessToken = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      refreshToken,
      updatedAt: user.updatedAt,
    },
    accessToken
  };
};


// FACEBOOK: retrieves profile with access token.
// Access token should have permission to read user profile and email. 
// Frontend should request for access token with scope ['email', 'public_profile'] at least.
export async function facebookAuth(accessToken, res) {
  if (!accessToken) throw new Error( 'Missing accessToken');
  
    const fields = 'id,name,email,picture';
    const resp = await axios.get(`https://graph.facebook.com/me?fields=${fields}&access_token=${accessToken}`);
    
    // Requested user profile from Graph API
    const data = resp.data; // id, name, email, picture
    const providerId = data.id;
    const name = data.name;
    const email = data.email;
    const picture = data.picture?.data?.url;
  
    // Find or create
    let user = await User.findOne({ provider: 'facebook', email }).select("_id name email role profileImage password isVerified refreshToken updatedAt");
    if (!user && email) user = await User.findOne({ email });
    if (!user) {
      if(await User.findOne({ email })) throw new Error('User already exists!');
      user = await User.create({
        provider: 'facebook',
        providerId,
        email,
        name,
        profileImage: picture,
        // Since Provider is Google, user is automatically [verified]
        isVerified: true
      });
    } else {
      user.provider = 'facebook';
      user.providerId = providerId;
      user.name = name;
      user.picture = picture;
      await user.save();
    }

    // This part is similar to general email-password login...
    const tokenPayLoad = { _id: user._id, role: user.role };

    const generatedAccessToken = user.generateAccessToken(tokenPayLoad);
    const refreshToken = user.generateRefreshToken(tokenPayLoad);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        refreshToken,
        updatedAt: user.updatedAt,
      },
      accessToken: generatedAccessToken
    };
}

// APPLE: 
// A robust implementation:: fetch Apple's JWKs and verify signature.
// onek pera eita...
export async function appleAuth(req, res) {
    const { idToken } = req.body;
    if (!idToken) throw new Error('Missing idToken');
    const applePayload = await verifyAppleToken(idToken);

    const { sub: appleId, email } = applePayload;
    const name = req.body.name; // Apple sometimes gives name only once (first login)
    const profileImage = req.body.profileImage || "";

    // 1. Find or create user
    let user = await User.findOne({ appleId });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.appleId = appleId;
        await user.save();
      } else {
        user = new User({
          appleId,
          email,
          name,
          isVerified: true,
          provider: "apple",
          profileImage,
        });
        await user.save();
      }
    }

    // This part is similar to general email-password login...
    const payload = { _id: user._id, role: user.role };

    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        refreshToken,
        updatedAt: user.updatedAt,
      },
      accessToken
    };
}


export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  const user = await User.findOne({ refreshToken });

  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete)

  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token')

  const payload = { _id: user._id , role: user.role }

  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false })

  return {
    accessToken,
    refreshToken: newRefreshToken
  }
};


export const forgetPasswordService = async (email) => {

  if (!email) throw new Error('Email is required')

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp)
  });

  return;
};


export const verifyCodeService = async ({ email, otp }) => {

  if (!email || !otp) throw new Error('Email and otp are required')

  const user = await User.findOne({ email });

  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (parseInt(user.otp, 10) !== parseInt(otp, 10) || Date.now() > user.otpExpires.getTime()) throw new Error('Invalid or expired otp')

  user.otp = null;
  user.otpExpires = null;
  await user.save({ validateBeforeSave: false });

  return;
};


export const resetPasswordService = async ({ email, newPassword }) => {
  if (!email || !newPassword) throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (user.otp || user.otpExpires) throw new Error('otp not cleared');

  user.password = newPassword;
  await user.save();

  return;
};


export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  if (!userId || !oldPassword || !newPassword) throw new Error('User id, old password and new password are required');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(userId, oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();

  return;
};


// // Google OAuth client
// const googleClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

// // Generate tokens
// const generateTokens = (user) => {
//   const payload = {
//     userId: user._id.toString(),
//     email: user.email,
//     role: user.role,
//   };

//   const accessToken = jwt.sign(payload, accessTokenSecrete, { expiresIn: accessTokenExpires });
//   const refreshToken = jwt.sign(payload, refreshTokenSecrete, { expiresIn: refreshTokenExpires });

//   return { accessToken, refreshToken };
// };

// // Main social login service
// export const socialLoginService = async (provider, token) => {
//   let userData = null;

//   if (provider === 'google') {
//     userData = await verifyGoogleToken(token);
//   } else if (provider === 'facebook') {
//     userData = await verifyFacebookToken(token);
//   } else if (provider === 'apple') {
//     userData = await verifyAppleToken(token);
//   } else {
//     throw new Error('Unsupported provider');
//   }

//   if (!userData || !userData.email) {
//     throw new Error(`${provider} authentication failed`);
//   }

//   const { email, name, profilePicture, providerId } = userData;

//   let user = await User.findOne({
//     $or: [
//       { email },
//       { provider, providerId },
//     ],
//   });

//   if (user) {
//     // Update existing user
//     user.name = name || user.name;
//     user.profileImage = profilePicture || user.profileImage;
//     user.provider = provider;
//     user.providerId = providerId;
//     user.lastLogin = new Date();
//     await user.save();
//   } else {
//     // Create new user
//     user = await User.create({
//       name,
//       email,
//       profileImage: profilePicture || '',
//       provider,
//       providerId,
//       emailVerified: true,
//       isVerified: true,
//       lastLogin: new Date(),
//     });
//   }

//   const tokens = generateTokens(user);

//   user.refreshToken = tokens.refreshToken;
//   await user.save({ validateBeforeSave: false });

//   return {
//     user: {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       provider: user.provider,
//       providerId: user.providerId,
//       profileImage: user.profileImage,
//     },
//     accessToken: tokens.accessToken,
//     refreshToken: tokens.refreshToken,
//   };
// };

// // Verify Google token
// const verifyGoogleToken = async (token) => {
//   const ticket = await googleClient.verifyIdToken({
//     idToken: token,
//     audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
//   });

//   const payload = ticket.getPayload();
//   return {
//     email: payload.email,
//     name: payload.name,
//     profilePicture: payload.picture,
//     providerId: payload.sub,
//   };
// };

// // Verify Facebook token
// const verifyFacebookToken = async (token) => {
//   const response = await axios.get(
//     `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
//   );
//   const { id, name, email, picture } = response.data;
//   return {
//     email,
//     name,
//     profilePicture: picture?.data?.url,
//     providerId: id,
//   };
// };

// // Verify Apple token (placeholder — Flutter team will handle)
// const verifyAppleToken = async (token) => {
//   // Apple token verification usually happens in Flutter using Sign in with Apple,
//   // and backend gets user info (email, name, sub).
//   // Here you can decode the JWT if needed:
//   // const decoded = jwt.decode(token);
//   // return { email: decoded.email, name: decoded.name, providerId: decoded.sub };

//   return {}; // Placeholder
// };
