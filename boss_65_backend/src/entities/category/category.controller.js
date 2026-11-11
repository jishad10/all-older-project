import * as categoryService from "./category.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";


export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategoriesService();
    generateResponse(res, 200, true, "Categories fetched successfully", categories);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch categories", error.message);
  }
};


export const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryByIdService(req.params.id);
    if (!category) {
      return generateResponse(res, 404, false, "Category not found");
    }
    generateResponse(res, 200, true, "Category fetched successfully", category);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch category", error.message);
  }
};


export const createCategory = async (req, res) => {
  try {
    //console.log(req.body);
    const { name } = req.body;
    const file = req.files?.image?.[0];

    let image = null;

    if (file) {
      const result = await cloudinaryUpload(file.path, `thumb_${Date.now()}`, "category/images");
      if (result?.secure_url) image = result.secure_url;

    }

    const category = await categoryService.createCategoryService({
      name,
      image: image,
    });

    generateResponse(res, 201, true, "Category created successfully", category);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create category", error.message);
  }
};


export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.files?.image?.[0];

    let updatedFields = {};
    if (name) updatedFields.name = name;

    if (file) {
      const result = await cloudinaryUpload(file.path, `thumb_${Date.now()}`, "category/images");
      if (result?.secure_url) updatedFields.image = result.secure_url;
    }

    const updatedCategory = await categoryService.updateCategoryService(req.params.id, updatedFields);

    if (!updatedCategory) {
      return generateResponse(res, 404, false, "Category not found");
    }

    generateResponse(res, 200, true, "Category updated successfully", updatedCategory);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update category", error.message);
  }
};


export const deleteCategory = async (req, res) => {
  try {
    const deleted = await categoryService.deleteCategoryService(req.params.id);
    if (!deleted) {
      return generateResponse(res, 404, false, "Category not found");
    }
    generateResponse(res, 200, true, "Category deleted successfully");
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete category", error.message);
  }
};















