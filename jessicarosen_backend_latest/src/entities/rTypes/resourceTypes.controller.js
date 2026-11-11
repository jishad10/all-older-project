import { generateResponse } from '../../lib/responseFormate.js';
import { createResourceTypeService, getAllResourceTypesService, getResourceTypeByIdService, updateResourceTypeService, deleteResourceTypeService } from './resourceTypes.service.js';


export const createResourceType = async (req, res) => {
  try {
    const { resourceTypeName, description } = req.body;
    const createdBy = req.user._id;

    const resourceType = await createResourceTypeService({ resourceTypeName, description, createdBy });

    generateResponse(res, 201, true, 'Resource Type created successfully', resourceType);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to create Resource Type', error.message);
  }
};


export const getAllResourceTypes = async (req, res) => {
  try {
    const resourceTypes = await getAllResourceTypesService();
    return res.status(200).json({
      success: true,
      message: 'Fetched Resource Types',
      data: resourceTypes
    });
  }

  catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Resource Types', error.message);
  }
};


export const getResourceTypeById = async (req, res) => {
  try {
    const resourceType = await getResourceTypeByIdService(req.params.id);
    if (!resourceType) return generateResponse(res, 404, false, 'Resource Type not found');

    generateResponse(res, 200, true, 'Fetched Resource Type', resourceType);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Resource Type', error.message);
  }
};


export const updateResourceType = async (req, res) => {
  try {
    const updated = await updateResourceTypeService(req.params.id, req.body);
    generateResponse(res, 200, true, 'Resource Type updated successfully', updated);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to update Resource Type', error.message);
  }
};


export const deleteResourceType = async (req, res) => {
  try {
    const deleted = await deleteResourceTypeService(req.params.id);
    generateResponse(res, 200, true, 'Resource Type deleted successfully', deleted);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to delete Resource Type', error.message);
  }
};

