import express from 'express';
import { adminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';
import {
  createIslandController,
  deleteIslandController,
  getAllIslandsController,
  getIslandByIdController,
  updateIslandController,
  getIslandOverview,
  getIslandListings,
} from './island.controller.js';

const router = express.Router();

// ─── OVERVIEW (must be before /:id) ──────────────────────────────────────────
router.get('/overview', verifyToken, adminMiddleware, getIslandOverview);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/',   getAllIslandsController);
router.get('/:id',  getIslandByIdController);

router.post('/',verifyToken, adminMiddleware, createIslandController);
router.put('/:id',verifyToken, adminMiddleware, updateIslandController);
router.delete('/:id', verifyToken, adminMiddleware, deleteIslandController);

// ─── LISTINGS ─────────────────────────────────────────────────────────────────
router.get('/:id/listings', verifyToken, adminMiddleware, getIslandListings);

export default router;