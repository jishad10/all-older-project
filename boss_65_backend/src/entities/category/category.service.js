import Category from "./category.model.js";
import mongoose from "mongoose";


export const getAllCategoriesService = async () => {
  return await Category.find().sort({ createdAt: -1 }); 
};


export const getCategoryByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Category.findById(id);
};


export const createCategoryService = async (data) => {
  const category = new Category(data);
  return await category.save();
};


export const updateCategoryService = async (id, updatedFields) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Category.findByIdAndUpdate(id, updatedFields, { new: true, runValidators: true });
};


export const deleteCategoryService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const result = await Category.findByIdAndDelete(id);
  return result ? true : false;
};



