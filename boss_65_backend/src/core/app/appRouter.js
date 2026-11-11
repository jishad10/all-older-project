import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import categoryRoutes from '../../entities/category/category.routes.js';
import roomRoutes from '../../entities/room/room.routes.js';
import bookingRoutes from '../../entities/booking/booking.routes.js';
import promoCodeRoutes from '../../entities/promo_code/promo_code.routes.js';
import adminRoutes from '../../entities/admin/adminRoutes.js';
import paymentRoutes from '../../entities/payment/payment.routes.js';
import emailRoutes from '../../entities/email/email.routes.js';
import reviewRoutes from '../../entities/review/review.routes.js';


const router = express.Router();


// Define all your routes here
router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/contact', contactRoutes)
router.use('/v1/admin',adminRoutes)
router.use('/v1/category', categoryRoutes);
router.use('/v1/room', roomRoutes);
router.use('/v1/booking', bookingRoutes);
router.use('/v1/promo-codes', promoCodeRoutes);
router.use('/v1/payment', paymentRoutes);
router.use('/v1/email', emailRoutes);

router.use('/v1/review', reviewRoutes);


export default router;
