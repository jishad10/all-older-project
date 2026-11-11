import mongoose from "mongoose";
import Review from "./review.model.js";

export const createReviewService = async ({ resourceId, userId, rating, comment }) => {
    if (!resourceId || !userId || !rating || !comment) throw new Error("All fields are required");
    if (rating < 0 || rating > 5) throw new Error("Rating must be between 0 and 5");

    const review = new Review({ resourceId, userId, rating, comment });
    await review.save();
    return
};


export const getAllReviewsOfProductService = async (resourceId, page, limit, skip) => {
    if (!resourceId) throw new Error("Resource ID is required");

    const objectId = new mongoose.Types.ObjectId(resourceId);

    const [reviews, totalItems, ratingStats, lastThreeReviews] = await Promise.all([
        Review.find({ resourceId })
            .select("-__v -updatedAt -resourceId")
            .populate("userId", "firstName lastName email profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(3),

        Review.countDocuments({ resourceId }),

        Review.aggregate([
            { $match: { resourceId: objectId } },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                }
            }
        ]),

        
    ]);

    const averageRatingAgg = await Review.aggregate([
        { $match: { resourceId: objectId } },
        {
            $group: {
                _id: "$resourceId",
                averageRating: { $avg: "$rating" }
            }
        }
    ]);

    const averageRating = averageRatingAgg[0]?.averageRating || 0;

    // Build rating breakdown (1 to 5 stars)
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingStats.forEach(stat => {
        ratingBreakdown[stat._id] = stat.count;
    });

    const totalPages = Math.ceil(totalItems / limit);

    const data = {
        reviews,
        averageRating,
        totalReviews: totalItems,
        ratingBreakdown,
        lastThreeReviews
    };

    return data;
};

