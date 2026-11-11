import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalProperty', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },

  // admin can hide/show a review
  status: {
    type: String,
    enum: ['visible', 'hidden'],
    default: 'visible',
  },
}, { timestamps: true });

// one review per user per property
ReviewSchema.index({ property: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', ReviewSchema);
export default Review;