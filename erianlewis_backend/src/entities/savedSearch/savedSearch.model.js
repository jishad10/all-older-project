import mongoose from 'mongoose';

const SavedSearchSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:  { type: String, required: true, trim: true }, // e.g. "Rental search"
  filters: {
    search:      { type: String, default: '' },
    listingType: { type: String, enum: ['rent', 'buy', ''], default: '' },
    island:      { type: mongoose.Schema.Types.ObjectId, ref: 'Island', default: null },
    type:        { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    minPrice:    { type: Number, default: null },
    maxPrice:    { type: Number, default: null },
    bedrooms:    { type: Number, default: null },
    bathrooms:   { type: Number, default: null },
    petFriendly: { type: Boolean, default: null },
    amenities:   { type: [String], default: [] },
  },
}, { timestamps: true });

const SavedSearch = mongoose.model('SavedSearch', SavedSearchSchema);
export default SavedSearch;