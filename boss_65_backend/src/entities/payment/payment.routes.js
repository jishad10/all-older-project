import express from 'express'
import { getBookingDetails, payment, confirmPaymentController } from './payment.controller.js'


const router = express.Router()

router.post('/payment-intent', payment)
router.post('/confirm', confirmPaymentController);
router.get('/booking/:bookingId',getBookingDetails)


export default router