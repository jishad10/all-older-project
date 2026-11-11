import jwt from 'jsonwebtoken';
import {accessTokenSecrete} from '../../core/config/config.js';
import RoleType from '../../lib/types.js';
import User from '../../entities/auth/auth.model.js';
import { generateResponse } from '../../lib/responseFormate.js';

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) generateResponse(res, 401, false, 'No token, auth denied', null);

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    const user = await User.findById(decoded._id).select('-password -createdAt -updatedAt -__v');
    req.user = user;
    next();
  }

  catch (err) {
    if (err.name === "TokenExpiredError") {
      generateResponse(res, 401, false, 'Token expired', null);
    }

    else if (err.name === "JsonWebTokenError") {
      generateResponse(res, 401, false, 'Token is not valid', null);
    }

    else if (err.name === "NotBeforeError") {
      generateResponse(res, 401, false, 'Token not active', null);
    }

    else {
      next(err)
    }
  }
};


const userMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: User not found', null);
  }
  const { role } = req.user;

  if (role !== "USER") {
    generateResponse(res, 403, false, 'User access only', null);
  }

  next();
};


const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Admin not found', null);
  }
  const { role } = req.user;

  if (role !== "ADMIN") {
    generateResponse(res, 403, false, 'Admin access only', null);
  }

  next();
};


const lenderMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Lender not found', null);
  }
  const { role } = req.user;

  if (role !== "LENDER") {
    generateResponse(res, 403, false, 'Lender access only', null);
  }

  next();
};


const adminLenderMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Lender not found', null);
  }
  const { role } = req.user || {};

  if (role !== RoleType.ADMIN && role !== RoleType.LENDER) {
    generateResponse(res, 403, false, 'Admin or Lender access only', null);
  }

  next();
};


const userAdminLenderMiddleware = (req, res, next) => {
  const { role } = req.user || {};

  if (![RoleType.USER, RoleType.ADMIN, RoleType.LENDER].includes(role))
 {
    return generateResponse(res, 403, false, 'User, Admin or Lender access only', null);
  }
  next();
};


const optionalVerifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return next(); 

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    const user = await User.findById(decoded._id).select('-password -createdAt -updatedAt -__v');
    if (user) req.user = user;
  } catch (err) {
    console.warn('Token present but invalid. Proceeding as guest.');
  }

  next(); 
};

export{ userMiddleware, adminMiddleware, lenderMiddleware, adminLenderMiddleware, userAdminLenderMiddleware , optionalVerifyToken};

