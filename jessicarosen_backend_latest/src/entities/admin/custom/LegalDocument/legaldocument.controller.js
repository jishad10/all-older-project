import { generateResponse } from "../../../../lib/responseFormate.js";
import {
  getAllLegalDocuments,
  getLegalDocumentById,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument
} from "./legaldocument.service.js";

// Get all legal documents
export const getAllLegalDocumentsController = async (req, res) => {
  try {
    const documents = await getAllLegalDocuments();
    generateResponse(res, 200, true, "Fetched all legal documents", documents);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch legal documents", error.message);
  }
};

// Get legal document by ID
export const getLegalDocumentByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await getLegalDocumentById(id);
    generateResponse(res, 200, true, "Fetched legal document", document);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to fetch legal document", error.message);
  }
};

// Create new legal document
export const createLegalDocumentController = async (req, res) => {
  try {
    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;

    const newDocument = await createLegalDocument(formData, filePath);
    generateResponse(res, 201, true, "Legal document created", newDocument);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create legal document", error.message);
  }
};

// Update existing legal document
export const updateLegalDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = req.files?.image?.[0]?.path;
    const formData = req.body;

    const updatedDocument = await updateLegalDocument(id, formData, filePath);
    generateResponse(res, 200, true, "Legal document updated", updatedDocument);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update legal document", error.message);
  }
};

// Delete legal document
export const deleteLegalDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteLegalDocument(id);
    generateResponse(res, 200, true, "Legal document deleted", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete legal document", error.message);
  }
};
