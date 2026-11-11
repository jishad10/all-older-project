import { generateResponse } from '../../lib/responseFormate.js';
import { getGoogleReviews } from './review.service.js';

export const fetchGoogleReviews = async (req, res) => {
  try {
    const reviews = await getGoogleReviews();
    generateResponse(res, 200, true, "Google reviews fetched successfully", reviews);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch Google reviews", error.message);
  }
};
