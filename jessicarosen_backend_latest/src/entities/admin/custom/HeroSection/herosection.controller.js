import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllHeroSections,
  getHeroSectionById,
  createHeroSection,
  updateHeroSection,
  deleteHeroSection
} from "./herosection.service.js";

// Get all hero sections
export const getAllHeroSectionsController = async (req, res) => {
  try {
    const sections = await getAllHeroSections();
    generateResponse(res, 200, true, "Fetched all hero sections", sections);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch hero sections", error.message);
  }
};

// Get hero section by ID
export const getHeroSectionByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await getHeroSectionById(id);
    generateResponse(res, 200, true, "Fetched hero section", section);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch hero section", error.message);
  }
};

// Create new hero section
export const createHeroSectionController = async (req, res) => {
  try {


    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;
    const newSection = await createHeroSection(formData, filePath);
    generateResponse(res, 201, true, "Hero section created", newSection);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create hero section", error.message);
  }
};

// Update existing hero section
export const updateHeroSectionController = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;
    const updatedSection = await updateHeroSection(id, formData, filePath);
    generateResponse(res, 200, true, "Hero section updated", updatedSection);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update hero section", error.message);
  }
};

// Delete hero section
export const deleteHeroSectionController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteHeroSection(id);
    generateResponse(res, 200, true, "Hero section deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete hero section", error.message);
  }
};
