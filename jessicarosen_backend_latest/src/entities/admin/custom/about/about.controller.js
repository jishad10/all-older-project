import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllAbouts,
  getAboutById,
  createAbout,
  updateAbout,
  deleteAbout
} from "./about.service.js";

// Get all About sections
export const getAllAboutsController = async (req, res) => {
  try {
    const sections = await getAllAbouts();
    generateResponse(res, 200, true, "Fetched all About sections", sections);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch About sections", error.message);
  }
};

// Get About by ID
export const getAboutByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await getAboutById(id);
    generateResponse(res, 200, true, "Fetched About section", section);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch About section", error.message);
  }
};

// Create About
export const createAboutController = async (req, res) => {
  try {
    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;

    const newSection = await createAbout(formData, filePath);
    generateResponse(res, 201, true, "About section created", newSection);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create About section", error.message);
  }
};

// Update About
export const updateAboutController = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;

    const updatedSection = await updateAbout(id, formData, filePath);
    generateResponse(res, 200, true, "About section updated", updatedSection);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update About section", error.message);
  }
};

// Delete About
export const deleteAboutController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAbout(id);
    generateResponse(res, 200, true, "About section deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete About section", error.message);
  }
};
