import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Read private key (.p8) generated in Apple Developer portal
const privateKey = fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH);

// JWT claims
const claims = {
  iss: process.env.APPLE_TEAM_ID,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 180), // up to 6 months
  aud: 'https://appleid.apple.com',
  sub: process.env.APPLE_CLIENT_ID
};

const token = jwt.sign(claims, privateKey, { algorithm: 'ES256', keyid: process.env.APPLE_KEY_ID });
console.log('APPLE_CLIENT_SECRET=', token);
