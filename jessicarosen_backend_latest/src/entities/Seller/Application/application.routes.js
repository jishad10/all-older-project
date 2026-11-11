import express from 'express';
import {
  promoteToSellerController,
  getAllSellersController,
  getSellerByIdController,
  deleteSellerByIdController
} from './application.controller.js';
import { adminMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(verifyToken,adminMiddleware, getAllSellersController); 

router
  .route('/apply')
  .post(verifyToken, promoteToSellerController); 

router
  .route('/:id')
  .get(verifyToken, getSellerByIdController)      
  .delete(verifyToken,adminMiddleware, deleteSellerByIdController); 

export default router;
