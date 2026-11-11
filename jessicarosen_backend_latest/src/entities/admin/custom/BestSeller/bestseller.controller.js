import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllBestSellers,
  getBestSellerById,
  createBestSeller,
  updateBestSeller,
  deleteBestSeller
} from "./bestseller.service.js";

// Get all bestsellers
export const getAllBestSellersController = async (req, res) => {
  try {
    const data = await getAllBestSellers();
    generateResponse(res, 200, true, "Fetched all bestsellers", data);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch bestsellers", error.message);
  }
};

// Get bestseller by ID
export const getBestSellerByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getBestSellerById(id);
    generateResponse(res, 200, true, "Fetched bestseller", data);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch bestseller", error.message);
  }
};

// Create new bestseller
export const createBestSellerController = async (req, res) => {
  try {
    const filePaths = req.files?.image?.map(file => file.path) || [];
    const formData = req.body;

    const newDoc = await createBestSeller(formData, filePaths);
    generateResponse(res, 201, true, "Bestseller created", newDoc);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create bestseller", error.message);
  }
};

// Update bestseller
export const updateBestSellerController = async (req, res) => {
  try {
    const { id } = req.params;
    const filePaths = req.files?.image?.map(file => file.path) || [];
    const formData = req.body;

    const updated = await updateBestSeller(id, formData, filePaths);
    generateResponse(res, 200, true, "Bestseller updated", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update bestseller", error.message);
  }
};

// Delete bestseller
export const deleteBestSellerController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBestSeller(id);
    generateResponse(res, 200, true, "Bestseller deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete bestseller", error.message);
  }
};
