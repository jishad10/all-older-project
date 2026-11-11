import mongoose from "mongoose";
const { Schema } = mongoose;

const reviewSchema = new Schema(
    {
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
