import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 500,
});

const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.email,
});

export { globalLimiter, emailVerificationLimiter };

