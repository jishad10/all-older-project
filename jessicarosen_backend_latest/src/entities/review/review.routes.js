import express from "express";
import {
    createReview,
    getAllReviewsOfResource
} from "./review.controller.js";

const router = express.Router();

// Public
router.get("/get-all-reviews-resource/:resourceId", getAllReviewsOfResource);

router.post(
    "/create",
    createReview
);

export default router;
