import { generateResponse } from '../../lib/responseFormate.js';
import {
  getAllCategoriesService,
  adminGetAllCategoriesService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from './category.service.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const data = await getAllCategoriesService();
    return generateResponse(res, 200, true, 'Categories fetched', data);
  } catch (error) { next(error); }
};

export const adminGetAllCategories = async (req, res, next) => {
  try {
    const data = await adminGetAllCategoriesService();
    return generateResponse(res, 200, true, 'Categories fetched', data);
  } catch (error) { next(error); }
};

export const createCategory = async (req, res, next) => {
  try {
    const data = await createCategoryService(req.body);
    return generateResponse(res, 201, true, 'Category created', data);
  } catch (error) {
    if (error.message === 'Category name is required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Category already exists')   return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const data = await updateCategoryService(req.params.id, req.body);
    return generateResponse(res, 200, true, 'Category updated', data);
  } catch (error) {
    if (error.message === 'Category not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await deleteCategoryService(req.params.id);
    return generateResponse(res, 200, true, 'Category deleted', null);
  } catch (error) {
    if (error.message === 'Category not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};