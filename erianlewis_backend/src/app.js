import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from "url";

import logger from './core/config/logger.js';
import errorHandler from './core/middlewares/errorMiddleware.js';
import notFound from './core/middlewares/notFound.js';
import { globalLimiter } from './lib/limit.js';
import appRouter from './core/app/appRouter.js';
import bodyParser from 'body-parser';
import { stripeWebhook } from './entities/subscription/webhook.controller.js';
import { applyPendingSubscriptionChanges } from './lib/Subscriptionexpiry.js';
import passport from 'passport';
import './lib/passport.js'; // ← IMPORT PASSPORT CONFIG (must be after passport import) 


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(xssClean());
app.use(mongoSanitize());
app.use(morgan('combined'));

app.post('/api/v1/subscription/webhook', bodyParser.raw({ type: "*/*" }), stripeWebhook);

app.use(express.json({ limit: '10000kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());  // ← MOVED UP — must be before routes

app.use(globalLimiter);

const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

app.use('/api', appRouter);

app.use(notFound);
app.use(errorHandler);

logger.info('Middleware stack initialized');

applyPendingSubscriptionChanges();

export { app };