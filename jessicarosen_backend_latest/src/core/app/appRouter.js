import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import practiceAreaRoutes from '../../entities/practiceArea/practiceArea.routes.js';
import resourceRoutes from '../../entities/resource/resource.routes.js';
import blogRoutes from '../../entities/blog/blog.routes.js';
import promoRoutes from '../../entities/promoCode/promo.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import messageRoutes from '../../entities/message/message.routes.js';
import reviewRoutes from '../../entities/review/review.routes.js';
import applicationRoutes from '../../entities/Seller/Application/application.routes.js'
import countryRoutes from '../../entities/country/country.routes.js';
import resourceTypesRoutes from '../../entities/rTypes/resourceTypes.routes.js'
import sellerOnboardingRoutes from '../../entities/Seller/Stripe-onboard/sellerStripeRoutes.js';
import paymentRoutes from '../../entities/Payment/payment.routes.js';
import dashboardRoutes from '../../entities/Seller/Dashboard/dashboard.routes.js';
import adminDashboardRoutes from '../../entities/admin/Dashboard/dashboard.routes.js';
import newsletterRoutes from '../../entities/newsletter/newsletter.routes.js';
import questionAnswerRoutes from '../../entities/QuesAns/qa.routes.js';
import heroRoutes from '../../entities/admin/custom/HeroSection/herosection.routes.js';
import aboutRoutes from '../../entities/admin/custom/about/about.routes.js';
import bestsellerRoutes from '../../entities/admin/custom/BestSeller/bestseller.routes.js';
import legalDocumentRoutes from '../../entities/admin/custom/LegalDocument/legaldocument.routes.js';
import privacyRoutes from '../../entities/admin/custom/privacy/privacy.routes.js';
import termRoutes from '../../entities/admin/custom/terms/terms.routes.js';
import subResourceType from '../../entities/subPracticeArea/subPracticeArea.routes.js';
import guestRouter from '../../entities/auth.guest/auth.guest.routes.js';
import customContactRoutes  from '../../entities/contact/customContact/customContactRoutes.js';
import adminDeleteRoutes from '../../entities/admin/accounts/adminDelete.routes.js';

const router = express.Router();

// Define all your routes here
router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/guest',guestRouter);
router.use('/v1/practice-area', practiceAreaRoutes);
router.use('/v1/country-state', countryRoutes);
router.use('/v1/resource', resourceRoutes);
router.use('/v1/resource-type', resourceTypesRoutes);
router.use('/v1/sub-resource-type', subResourceType);
router.use('/v1/blog', blogRoutes);
router.use('/v1/promo-codes', promoRoutes);
router.use('/v1/contact', contactRoutes)
router.use('/v1/message', messageRoutes);
router.use('/v1/qa', questionAnswerRoutes);
router.use('/v1/reviews', reviewRoutes);
router.use('/v1/seller',applicationRoutes)
router.use('/v1/stripe',sellerOnboardingRoutes);
router.use('/v1/payment',paymentRoutes);

router.use('/v1/seller/dashboard', dashboardRoutes);
router.use('/v1/admin/dashboard', adminDashboardRoutes);
router.use('/v1/admin/custom/hero', heroRoutes);
router.use('/v1/admin/custom/about', aboutRoutes);
router.use('/v1/admin/custom/bestseller', bestsellerRoutes);
router.use('/v1/admin/custom/legal-document', legalDocumentRoutes);
router.use('/v1/admin/custom/privacy', privacyRoutes);
router.use('/v1/admin/custom/terms', termRoutes);
router.use('/v1/admin/custom/contact',customContactRoutes);
router.use('/v1/admin/accounts', adminDeleteRoutes);

router.use('/v1/newsletter', newsletterRoutes);

export default router;
