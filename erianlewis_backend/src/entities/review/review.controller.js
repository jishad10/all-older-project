import { generateResponse } from '../../lib/responseFormate.js';
import {
  getMyReviewsService,
  getSingleReviewService,
  createReviewService,
  getPropertyReviewsService,
  updateReviewService,
  deleteReviewService,
  adminGetAllReviewsService,
  toggleReviewStatusService,
  adminDeleteReviewService,
  bulkDeleteReviewsService,
  bulkHideReviewsService,
  bulkUnhideReviewsService,
} from './review.service.js';


export const createReview = async (req, res, next) => {
  try {
    const data = await createReviewService(req.user._id, req.body);
    return generateResponse(res, 201, true, 'Review submitted successfully', data);
  } catch (error) {
    const clientErrors = [
      'Property is required', 'Rating is required',
      'Rating must be between 1 and 5',
      'You have already reviewed this property',
    ];
    if (clientErrors.includes(error.message)) return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Property not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const getPropertyReviews = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await getPropertyReviewsService(req.params.propertyId, { page, limit });
    return generateResponse(res, 200, true, 'Reviews fetched', data);
  } catch (error) { next(error); }
};


export const updateReview = async (req, res, next) => {
  try {
    const data = await updateReviewService(req.user._id, req.params.id, req.body);
    return generateResponse(res, 200, true, 'Review updated', data);
  } catch (error) {
    if (error.message === 'Rating must be between 1 and 5') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Review not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const deleteReview = async (req, res, next) => {
  try {
    await deleteReviewService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Review deleted', null);
  } catch (error) {
    if (error.message === 'Review not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


// Admin
export const adminGetAllReviews = async (req, res, next) => {
  try {
    const { page, limit, status, propertyId, island } = req.query;
    const data = await adminGetAllReviewsService({ page, limit, status, propertyId, island });
    return generateResponse(res, 200, true, 'Reviews fetched', data);
  } catch (error) { next(error); }
};


export const toggleReviewStatus = async (req, res, next) => {
  try {
    const data = await toggleReviewStatusService(req.params.id, req.user._id, req.user.email);
    return generateResponse(res, 200, true, `Review is now ${data.status}`, data);
  } catch (error) {
    if (error.message === 'Review not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const adminDeleteReview = async (req, res, next) => {
  try {
    await adminDeleteReviewService(req.params.id, req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Review deleted', null);
  } catch (error) {
    if (error.message === 'Review not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const getMyReviews = async (req, res, next) => {
  try {
    const data = await getMyReviewsService(req.user._id);
    return generateResponse(res, 200, true, 'My reviews fetched', data);
  } catch (error) { next(error); }
};


export const getSingleReview = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const data = await getSingleReviewService(req.params.id, req.user._id, isAdmin);
    return generateResponse(res, 200, true, 'Review fetched', data);
  } catch (error) {
    if (error.message === 'Review not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const bulkDeleteReviews = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkDeleteReviewsService(ids);
    return generateResponse(res, 200, true, `${data.deletedCount} review(s) deleted successfully`, data);
  } catch (error) {
    const status = error.message === 'No review IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};

export const bulkHideReviews = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkHideReviewsService(ids);
    return generateResponse(res, 200, true, `${data.modifiedCount} review(s) hidden successfully`, data);
  } catch (error) {
    const status = error.message === 'No review IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};

export const bulkUnhideReviews = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const data = await bulkUnhideReviewsService(ids);
    return generateResponse(res, 200, true, `${data.modifiedCount} review(s) unhidden successfully`, data);
  } catch (error) {
    const status = error.message === 'No review IDs provided' ? 400 : 500;
    generateResponse(res, status, false, error.message, null);
  }
};