import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllTerms,
  getTermsById,
  createTerms,
  updateTerms,
  deleteTerms
} from "./terms.service.js";

// Get all terms
export const getAllTermsController = async (req, res) => {
  try {
    const terms = await getAllTerms();
    generateResponse(res, 200, true, "Fetched all terms", terms);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch terms", error.message);
  }
};

// Get terms by ID
export const getTermsByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await getTermsById(id);
    generateResponse(res, 200, true, "Fetched terms", term);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch terms", error.message);
  }
};

// Create terms
export const createTermsController = async (req, res) => {
  try {
    const formData = req.body;
    const newTerm = await createTerms(formData);
    generateResponse(res, 201, true, "Terms created", newTerm);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create terms", error.message);
  }
};

// Update terms
export const updateTermsController = async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    const updatedTerm = await updateTerms(id, formData);
    generateResponse(res, 200, true, "Terms updated", updatedTerm);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update terms", error.message);
  }
};

// Delete terms
export const deleteTermsController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTerms(id);
    generateResponse(res, 200, true, "Terms deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete terms", error.message);
  }
};
