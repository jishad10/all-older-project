import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import {
  getFavorites,
  getFavorite,
  addFavorite,
  removeFavorite,
} from './favorite.controller.js';

const router = express.Router();

router.get   ('/', verifyToken, getFavorites);
router.get   ('/:propertyId', verifyToken, getFavorite);
router.post  ('/',verifyToken, addFavorite);
router.delete('/:propertyId', verifyToken, removeFavorite);

export default router;
