import { cloudinaryUpload } from "../../../../lib/cloudinaryUpload.js";
import LegalDocument from "./legaldocument.model.js";

// Create legal document
export const createLegalDocument = async (data, filePath) => {
  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `legal-${Date.now()}`, "legal-document");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  } else {
    throw new Error("Image is required");
  }
  return await LegalDocument.create(data);
};

// Get all legal documents
export const getAllLegalDocuments = async () => {
  return await LegalDocument.find().sort({ createdAt: -1 }).limit(2);
};

// Get legal document by ID
export const getLegalDocumentById = async (id) => {
  return await LegalDocument.findById(id);
};

// Update legal document
export const updateLegalDocument = async (id, data, filePath) => {
  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `legal-${Date.now()}`, "legal-document");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  }
  return await LegalDocument.findByIdAndUpdate(id, data, { new: true });
};

// Delete legal document
export const deleteLegalDocument = async (id) => {
  return await LegalDocument.findByIdAndDelete(id);
};
