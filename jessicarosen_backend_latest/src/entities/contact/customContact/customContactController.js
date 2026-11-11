import { generateResponse } from "../../../lib/responseFormate.js";
import { createCustomContactService, deleteCustomContactService, getAllCustomContactsService, getCustomContactByIdService, updateCustomContactService } from "./customContactService.js";

export const getAllCustomContactsController = async (req, res) => {
  try {
    const customContacts = await getAllCustomContactsService();
    generateResponse(res, 200, true, 'Custom contacts fetched successfully', customContacts);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to fetch custom contacts', error.message);
  }
};

export const getCustomContactByIdController = async (req, res) => {
  try {
    const customContact = await getCustomContactByIdService(req.params.id);
    generateResponse(res, 200, true, 'Custom contact fetched successfully', customContact);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to fetch custom contact', error.message);
  }
};

export const createCustomContactController = async (req, res) => {
  try {
    const customContact = await createCustomContactService(req.body);
    generateResponse(res, 201, true, 'Custom contact created successfully', customContact);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to create custom contact', error.message);
  }
};

export const updateCustomContactController = async (req, res) => {
  try {
    const customContact = await updateCustomContactService(req.params.id, req.body);
    generateResponse(res, 200, true, 'Custom contact updated successfully', customContact);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to update custom contact', error.message);
  }
};

export const deleteCustomContactController = async (req, res) => {
  try {
    const customContact = await deleteCustomContactService(req.params.id);
    generateResponse(res, 200, true, 'Custom contact deleted successfully', customContact);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to delete custom contact', error.message);
  }
};
