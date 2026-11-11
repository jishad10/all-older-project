import { cloudinaryUpload } from "../../../../lib/cloudinaryUpload.js";
import About from "./about.model.js";

// Create About section
export const createAbout = async (data, filePath) => {
  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `about-${Date.now()}`, "about");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  }
  return await About.create(data);
};

// Get all About sections
export const getAllAbouts = async () => {
  return await About.findOne().sort({ createdAt: -1 }).limit(1);
};

// Get About section by ID
export const getAboutById = async (id) => {
  return await About.findById(id);
};

// Update About section
export const updateAbout = async (id, data, filePath) => {
  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `about-${Date.now()}`, "about");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  }
  return await About.findByIdAndUpdate(id, data, { new: true });
};

// Delete About section
export const deleteAbout = async (id) => {
  return await About.findByIdAndDelete(id);
};
