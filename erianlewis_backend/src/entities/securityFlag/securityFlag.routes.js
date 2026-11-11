import express from 'express';
import { verifyToken, adminMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  getAllFlags,
  getFlagById,
  createFlag,
  updateFlag,
  resolveFlag,
  unresolveFlag,
  deleteFlag,
  searchUsersForFlag,
} from './securityFlag.controller.js';

const router = express.Router();

// All admin only
router.get   ('/', verifyToken, adminMiddleware, getAllFlags);
router.get   ('/search-users', verifyToken, adminMiddleware, searchUsersForFlag);
router.get   ('/:id', verifyToken, adminMiddleware, getFlagById);
router.post  ('/',  verifyToken, adminMiddleware, createFlag);
router.put   ('/:id', verifyToken, adminMiddleware, updateFlag);
router.put ('/:id/resolve', verifyToken, adminMiddleware, resolveFlag);
router.put ('/:id/unresolve', verifyToken, adminMiddleware, unresolveFlag);
router.delete('/:id',  verifyToken, adminMiddleware, deleteFlag);

export default router;