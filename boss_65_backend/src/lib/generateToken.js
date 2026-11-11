import { refreshTokenSecrete,accessTokenSecrete, accessTokenExpires, refreshTokenExpires } from "../core/config/config.js";
import jwt from "jsonwebtoken";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload,accessTokenSecrete , { expiresIn: accessTokenExpires });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, refreshTokenSecrete, { expiresIn: refreshTokenExpires });
};


