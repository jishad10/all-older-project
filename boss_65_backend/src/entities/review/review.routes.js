import express from 'express';
import { fetchGoogleReviews } from './review.controller.js';


const router = express.Router();

router.get('/', fetchGoogleReviews);

export default router;
