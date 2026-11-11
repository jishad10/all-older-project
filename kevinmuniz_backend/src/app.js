// import csurf from 'csurf';
// app.use(csurf({ cookie: true }));

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import logger from './core/config/logger.js';
import errorHandler from './core/middlewares/errorMiddleware.js';
import notFound from './core/middlewares/notFound.js';
import { globalLimiter } from './lib/limit.js';
import appRouter from './core/app/appRouter.js';
import { stripeWebhook } from './entities/Donation/webhook.controller.js';
import { initSocketIO } from './entities/notification/socketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// HTTP server 
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store io instance globally so services can emit events
initSocketIO(io);

// Socket.IO connection handler
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Register user to their personal notification room
  // Client must emit this right after connecting with their userId
  socket.on("registerUser", (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`Socket ${socket.id} registered to user room: user-${userId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});


// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);
app.use(xssClean());
app.use(mongoSanitize());

// Logging middleware
app.use(morgan('combined'));

// Stripe webhook MUST be registered before express.json()
// Stripe requires the raw body for signature verification
app.post(
  '/api/v1/donation/webhook',
  express.raw({ type: '*/*' }),
  stripeWebhook
);

// Body parsing middleware
app.use(express.json({ limit: '10000kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting middleware
app.use(globalLimiter);

// Static files middleware
const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

// API routes
app.use('/api', appRouter);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

logger.info('Middleware stack initialized');

export { app, server };