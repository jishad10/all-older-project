import mongoose from 'mongoose';


const CmsSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      enum: ['terms_conditions', 'privacy_policy'],
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);


const Cms = mongoose.models.Cms || mongoose.model('Cms', CmsSchema);
export default Cms;