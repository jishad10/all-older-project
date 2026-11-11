import express from 'express'
import { adminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js'
import { broadcastNewsletter, subscribeNewsletter } from './newsletter.controller.js'


const router = express.Router()

router.post('/subscribe', subscribeNewsletter)
router.post('/broadcast', verifyToken, adminMiddleware, broadcastNewsletter)

export default router
