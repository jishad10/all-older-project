import * as categoryService from "./category.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import { createPaginationInfo } from "../../lib/pagination.js";


// Get all categories (pagination)
export const getAllCategories = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const { categories, totalData } =
      await categoryService.getAllCategoriesService({ page, limit });

    const pagination = createPaginationInfo(page, limit, totalData);

    generateResponse(res, 200, true, "Categories fetched successfully", {
      data: categories,
      pagination
    });

  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch categories", error.message);
  }
};


// Get by id
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


// Create
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await categoryService.createCategoryService({
      name,
      description
    });

    generateResponse(res, 201, true, "Category created successfully", category);

  } catch (error) {
    generateResponse(res, 400, false, error.message);
  }
};


// Update
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const updatedCategory =
      await categoryService.updateCategoryService(req.params.id, {
        name,
        description
      });

    if (!updatedCategory) {
      return generateResponse(res, 404, false, "Category not found");
    }

    generateResponse(res, 200, true, "Category updated successfully", updatedCategory);

  } catch (error) {
    generateResponse(res, 400, false, error.message);
  }
};


// Delete
export const deleteCategory = async (req, res) => {
  try {
    const deleted =
      await categoryService.deleteCategoryService(req.params.id);

    if (!deleted) {
      return generateResponse(res, 404, false, "Category not found");
    }

    generateResponse(res, 200, true, "Category deleted successfully");

  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete category", error.message);
  }
};
