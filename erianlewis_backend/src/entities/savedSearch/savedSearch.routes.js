import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import {
  getSavedSearch,
  getSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
} from './savedSearch.controller.js';

const router = express.Router();

router.get   ('/',    verifyToken, getSavedSearches);
router.get   ('/:id', verifyToken, getSavedSearch);
router.post  ('/',    verifyToken, createSavedSearch);
router.put   ('/:id', verifyToken, updateSavedSearch);
router.delete('/:id', verifyToken, deleteSavedSearch);

export default router;
