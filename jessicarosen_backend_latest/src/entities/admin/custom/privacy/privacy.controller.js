import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllPrivacy,
  getPrivacyById,
  createPrivacy,
  updatePrivacy,
  deletePrivacy
} from "./privacy.service.js";

// Get all privacy entries
export const getAllPrivacyController = async (req, res) => {
  try {
    const data = await getAllPrivacy();
    generateResponse(res, 200, true, "Fetched all privacy policies", data);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch privacy policies", error.message);
  }
};

// Get a single privacy entry by ID
export const getPrivacyByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getPrivacyById(id);
    generateResponse(res, 200, true, "Fetched privacy policy", item);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch privacy policy", error.message);
  }
};

// Create a new privacy policy
export const createPrivacyController = async (req, res) => {
  try {
    const formData = req.body;
    const newEntry = await createPrivacy(formData);
    generateResponse(res, 201, true, "Privacy policy created", newEntry);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create privacy policy", error.message);
  }
};

// Update a privacy policy
export const updatePrivacyController = async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    const updated = await updatePrivacy(id, formData);
    generateResponse(res, 200, true, "Privacy policy updated", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update privacy policy", error.message);
  }
};

// Delete a privacy policy
export const deletePrivacyController = async (req, res) => {
  try {
    const { id } = req.params;
    await deletePrivacy(id);
    generateResponse(res, 200, true, "Privacy policy deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete privacy policy", error.message);
  }
};
