import jwt from 'jsonwebtoken';
import {accessTokenSecrete} from '../../core/config/config.js';
import RoleType from '../../lib/types.js';
import User from '../../entities/auth/auth.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import Team from '../../entities/team/team.model.js';


export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return generateResponse(res, 401, false, "No token, auth denied", null);
  }

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);

    let account;

    account = await User.findById(decoded._id)
      .select("-password -createdAt -updatedAt -__v");

    if (!account) {
      account = await Team.findById(decoded._id)
        .select("-password -createdAt -updatedAt -__v");
    }

    if (!account) {
      return generateResponse(res, 401, false, "Invalid token user", null);
    }

    // Attach final user info to req.user
    req.user = {
      _id: account._id,
      email: account.email,
      role: decoded.role,               
      permissions: decoded.permissions || [],
      ...account.toObject()            
    };

    return next();
  } 
  catch (err) {
    if (err.name === "TokenExpiredError") {
      return generateResponse(res, 401, false, "Token expired", null);
    } 
    else if (err.name === "JsonWebTokenError") {
      return generateResponse(res, 401, false, "Token is not valid", null);
    } 
    else if (err.name === "NotBeforeError") {
      return generateResponse(res, 401, false, "Token not active", null);
    } 
    else {
      return next(err);
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

const driverMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: User not found', null);
  }
  const { role } = req.user;

  if (role !== "DRIVER") {
    generateResponse(res, 403, false, 'Driver access only', null);
  }

  next();
};


const userAdminMiddleware = (req, res, next) => {
  const { role } = req.user || {};

  if (![RoleType.USER, RoleType.ADMIN].includes(role))
 {
    return generateResponse(res, 403, false, 'User, Admin or Seller access only', null);
  }
  next();
};

const superAdminOrAdminMiddleware = (req, res, next) => {
  const { role } = req.user || {};

  if (![RoleType.SUPER_ADMIN, RoleType.ADMIN].includes(role))
 {
    return generateResponse(res, 403, false, 'Super Admin or Admin access only', null);
  }
  next();
};


export{ userMiddleware, driverMiddleware, adminMiddleware,  userAdminMiddleware, superAdminOrAdminMiddleware };
