import {
  createSubResourceTypeService,
  getAllSubResourceTypesService,
  getSubResourceTypeByIdService,
  updateSubResourceTypeService,
  deleteSubResourceTypeService
} from './subPracticeArea.service.js';

import { generateResponse } from "../../lib/responseFormate.js";

export const createSubResourceType = async (req, res) => {
  try {
    const { name, description, subResources } = req.body;
    const createdBy = req.user._id;

    const type = await createSubResourceTypeService({ name, description, createdBy, subResources });
    generateResponse(res, 201, true, "SubResourceType created successfully", type);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create SubResourceType", error.message);
  }
};

export const getAllSubResourceTypes = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const { data, pagination } = await getAllSubResourceTypesService(page, limit, skip);
    return res.status(200).json({ success: true, message: "Fetched all SubResourceTypes", data, pagination });
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch SubResourceTypes", error.message);
  }
};

export const getSubResourceTypeById = async (req, res) => {
  try {
    const type = await getSubResourceTypeByIdService(req.params.id);
    if (!type) return generateResponse(res, 404, false, "SubResourceType not found");
    generateResponse(res, 200, true, "Fetched SubResourceType", type);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch SubResourceType", error.message);
  }
};

export const updateSubResourceType = async (req, res) => {
  try {
    const updated = await updateSubResourceTypeService(req.params.id, req.body);
    generateResponse(res, 200, true, "SubResourceType updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update SubResourceType", error.message);
  }
};

export const deleteSubResourceType = async (req, res) => {
  try {
    const deleted = await deleteSubResourceTypeService(req.params.id);
    generateResponse(res, 200, true, "SubResourceType and its sub-resources deleted", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete SubResourceType", error.message);
  }
};
