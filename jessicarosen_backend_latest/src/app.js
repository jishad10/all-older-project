import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from 'http';
import bodyParser from 'body-parser';

import logger from './core/config/logger.js';
import errorHandler from './core/middlewares/errorMiddleware.js';
import notFound from './core/middlewares/notFound.js';
import { globalLimiter } from './lib/limit.js';
import appRouter from './core/app/appRouter.js';
import { stripeWebhookHandler } from './entities/Payment/stripeWebhook.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// --- Security middleware ---
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(xssClean());
app.use(mongoSanitize());
app.use(morgan('combined'));

// --- ⚠️ Place webhook BEFORE express.json ---
app.post(
  '/api/v1/payment/webhook',
  bodyParser.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// --- Body parsing (AFTER webhook only) ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Rate limiting ---
app.use(globalLimiter);

// --- Static files ---
const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

// --- Routes ---
app.use('/api', appRouter);

// --- Error handlers ---
app.use(notFound);
app.use(errorHandler);

logger.info('Middleware stack initialized');

export { app, server };
