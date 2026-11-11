import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name:   { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

const Category = mongoose.model('Category', CategorySchema);
export default Category;