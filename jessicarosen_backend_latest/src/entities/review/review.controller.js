import { generateResponse } from "../../lib/responseFormate.js";
import { createReviewService, getAllReviewsOfProductService } from "./review.service.js";

export const createReview = async (req, res, next) => {
    const { resourceId, userId, rating, comment } = req.body;
    try {
        await createReviewService({
            resourceId,
            userId,
            rating,
            comment
        });
        generateResponse(res, 201, true, "Review created successfully", null);
    }

    catch (error) {
        if (error.message === "All fields are required") {
            generateResponse(res, 400, false, error.message, null);
        }

        else if (error.message === "Rating must be between 0 and 5") {
            generateResponse(res, 400, false, error.message, null);
        }

        else {
            next(error)
        }
    }
}

export const getAllReviewsOfResource = async (req, res, next) => {
    const { resourceId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const reviews = await getAllReviewsOfProductService(resourceId, page, limit, skip);
        generateResponse(res, 200, true, "Reviews fetched successfully", reviews);
    } catch (error) {
        if (error.message === "Resource ID is required") {
            generateResponse(res, 400, false, error.message, null);
        } else {
            next(error);
        }
    }
};
