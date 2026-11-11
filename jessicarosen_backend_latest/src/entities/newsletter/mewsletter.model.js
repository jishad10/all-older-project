import mongoose from 'mongoose';

const NewsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Newsletter = mongoose.model('Newsletter', NewsletterSchema);

export default Newsletter;
