import Review from './review.model.js';
import { createAuditLog } from '../auditLog/auditLog.helper.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import { createPaginationInfo } from '../../lib/pagination.js';


/**
 * Create review — USER only, one per property
 */
export const createReviewService = async (userId, { propertyId, rating, comment }) => {
  if (!propertyId)          throw new Error('Property is required');
  if (!rating)              throw new Error('Rating is required');
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

  const property = await RentalProperty.findById(propertyId);
  if (!property) throw new Error('Property not found');

  const existing = await Review.findOne({ property: propertyId, user: userId });
  if (existing) throw new Error('You have already reviewed this property');

  const review = await Review.create({
    property: propertyId,
    user:     userId,
    rating,
    comment:  comment || '',
  });

  return review.populate('user', 'firstName lastName email');
};


/**
 * Get all reviews for a property (public)
 */
export const getPropertyReviewsService = async (propertyId, { page = 1, limit = 10 }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = { property: propertyId, status: 'visible' };
  const total  = await Review.countDocuments(filter);

  const reviews = await Review.find(filter)
    .populate('user', 'firstName lastName email profileImage')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  // average rating
  const allRatings = await Review.find({ property: propertyId, status: 'visible' }).select('rating');
  const avgRating  = allRatings.length
    ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
    : 0;

  return {
    reviews,
    avgRating: Number(avgRating),
    totalReviews: total,
    paginationInfo: createPaginationInfo(numericPage, numericLimit, total),
  };
};


/**

/**
 * Get all reviews by the logged-in user
 */
export const getMyReviewsService = async (userId) => {
  return Review.find({ user: userId })
    .populate("property", "basicInformation.propertyTitle address.island")
    .sort({ createdAt: -1 });
};

/**
 * Get single review by id
 */
export const getSingleReviewService = async (reviewId, userId, isAdmin = false) => {
  const filter = isAdmin ? { _id: reviewId } : { _id: reviewId, user: userId };
  const review = await Review.findOne(filter)
    .populate("user",     "firstName lastName email profileImage")
    .populate("property", "basicInformation.propertyTitle address.island");
  if (!review) throw new Error("Review not found");
  return review;
};


export const updateReviewService = async (userId, reviewId, { rating, comment }) => {
  const review = await Review.findOne({ _id: reviewId, user: userId });
  if (!review) throw new Error('Review not found');

  if (rating) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
    review.rating = rating;
  }
  if (comment !== undefined) review.comment = comment;

  await review.save();
  return review;
};


/**
 * Delete own review
 */
export const deleteReviewService = async (userId, reviewId) => {
  const review = await Review.findOne({ _id: reviewId, user: userId });
  if (!review) throw new Error('Review not found');
  await Review.findByIdAndDelete(reviewId);
  return true;
};


/**
 * Admin — get ALL reviews with full user + property info
 */
export const adminGetAllReviewsService = async ({ page = 1, limit = 10, status, propertyId, island }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {};
  if (status)     filter.status   = status;
  if (propertyId) filter.property = propertyId;

  // island filter — find all properties on that island first, then filter reviews
  if (island) {
    const properties = await RentalProperty.find({ 'address.island': island }).select('_id');
    const propertyIds = properties.map(p => p._id);
    filter.property = { $in: propertyIds };
  }

  const total = await Review.countDocuments(filter);

  const reviews = await Review.find(filter)
    .populate('user',     'firstName lastName email profileImage role')
    .populate('property', 'basicInformation.propertyTitle address.island createdBy')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { reviews, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


/**
 * Admin — toggle review visibility (hide / unhide)
 */
export const toggleReviewStatusService = async (reviewId, adminId, adminEmail) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found');

  review.status = review.status === 'visible' ? 'hidden' : 'visible';
  await review.save();

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  review.status === 'hidden' ? 'review_hidden' : 'review_visible',
    entity:  { type: 'review', id: reviewId, label: '' },
    details: { newStatus: review.status },
  });

  return review;
};


/**
 * Admin — delete any review
 */
export const adminDeleteReviewService = async (reviewId, adminId, adminEmail) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found');
  await Review.findByIdAndDelete(reviewId);

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'inquiry_deleted',
    entity:  { type: 'review', id: reviewId, label: '' },
    details: {},
  });

  return true;
};


// Admin — bulk delete reviews
export const bulkDeleteReviewsService = async (ids) => {
  if (!ids?.length) throw new Error('No review IDs provided');
  const result = await Review.deleteMany({ _id: { $in: ids } });
  return { deletedCount: result.deletedCount };
};

// Admin — bulk hide reviews (set status to hidden)
export const bulkHideReviewsService = async (ids) => {
  if (!ids?.length) throw new Error('No review IDs provided');
  const result = await Review.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'hidden' } }
  );
  return { modifiedCount: result.modifiedCount };
};

// Admin — bulk unhide reviews (set status to visible)
export const bulkUnhideReviewsService = async (ids) => {
  if (!ids?.length) throw new Error('No review IDs provided');
  const result = await Review.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'visible' } }
  );
  return { modifiedCount: result.modifiedCount };
};