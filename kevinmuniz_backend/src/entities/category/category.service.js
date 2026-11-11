import Category from "./category.model.js";
import mongoose from "mongoose";



// Get all with pagination
export const getAllCategoriesService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const categories = await Category.aggregate([
    { $sort: { createdAt: -1 } },

    { $skip: skip },

    { $limit: limit },

    {
      $lookup: {
        from: "campaigns",
        localField: "_id",
        foreignField: "category",
        as: "campaigns"
      }
    },

    {
      $addFields: {
        Campaigns: { $size: "$campaigns" }
      }
    },

    {
      $project: {
        campaigns: 0
      }
    }
  ]);

  const totalData = await Category.countDocuments();

  return { categories, totalData };
};


// Get by id
export const getCategoryByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Category.findById(id);
};


// Create
export const createCategoryService = async ({ name, description }) => {

  if (!name?.trim() || !description?.trim()) {
    throw new Error("Name and description are required.");
  }

  const existingCategory = await Category.findOne({
    name: name.trim()
  });

  if (existingCategory) {
    throw new Error("Category already exists.");
  }

  const category = new Category({
    name: name.trim(),
    description: description.trim()
  });

  return await category.save();
};


// Update
export const updateCategoryService = async (id, { name, description }) => {

  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const updateData = {};

  if (name) {
    const existing = await Category.findOne({
      name: name.trim(),
      _id: { $ne: id }
    });

    if (existing) {
      throw new Error("Category name already exists.");
    }

    updateData.name = name.trim();
  }

  if (description) {
    updateData.description = description.trim();
  }

  return await Category.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );
};


// Delete
export const deleteCategoryService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  // safety
  const productExists = await Product.exists({ category: id });
  if (productExists) {
    throw new Error("Cannot delete category. Products are using this category.");
  }

  const result = await Category.findByIdAndDelete(id);
  return result ? true : false;
};
