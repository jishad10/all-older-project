import { generateResponse } from "../../../lib/responseFormate.js";
import {
  promoteToSellerIfUserExists,
  getAllSellersService,
  getSellerByIdService,
  deleteSellerByIdService
} from "./application.service.js";

// Promote a user to seller by email
export const promoteToSellerController = async (req, res) => {
  try {
    const email  = req.user.email;
    const user = await promoteToSellerIfUserExists(email);
    generateResponse(res, 200, true, "User promoted to seller successfully", user);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to promote user", error.message);
  }
};

// Get all sellers
export const getAllSellersController = async (req, res) => {
  try {
    const sellers = await getAllSellersService();
    generateResponse(res, 200, true, "Fetched all sellers", sellers);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch sellers", error.message);
  }
};

// Get seller by ID
export const getSellerByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await getSellerByIdService(id);
    generateResponse(res, 200, true, "Fetched seller", seller);
  } catch (error) {
    generateResponse(res, 404, false, "Seller not found", error.message);
  }
};

// Delete seller by ID
export const deleteSellerByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSellerByIdService(id);
    generateResponse(res, 200, true, "Seller deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete seller", error.message);
  }
};
