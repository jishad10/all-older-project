import { generateResponse } from '../../lib/responseFormate.js';
import { createPracticeAreaService, getAllPracticeAreasService, getPracticeAreaByIdService, updatePracticeAreaService, deletePracticeAreaService } from './practiceArea.service.js';


export const createPracticeArea = async (req, res) => {
  try {
    const { name, description, subPracticeAreas } = req.body;
    const createdBy = req.user._id;

    const practiceArea = await createPracticeAreaService({ name, description, createdBy , subPracticeAreas });
    generateResponse(res, 201, true, 'Practice Area created successfully', practiceArea);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to create Practice Area', error.message);
  }
};


export const getAllPracticeAreas = async (req, res) => {
  try {
    const practiceAreas = await getAllPracticeAreasService();
    return res.status(200).json({
      success: true,
      message: 'Fetched Practice Areas',
      data: practiceAreas
    });
  }

  catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Practice Areas', error.message);
  }
};


export const getPracticeAreaById = async (req, res) => {
  try {
    const practiceArea = await getPracticeAreaByIdService(req.params.id);
    if (!practiceArea) return generateResponse(res, 404, false, 'Practice Area not found');

    generateResponse(res, 200, true, 'Fetched Practice Area', practiceArea);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Practice Area', error.message);
  }
};


export const updatePracticeArea = async (req, res) => {
  try {
    const updated = await updatePracticeAreaService(req.params.id, req.body);
    generateResponse(res, 200, true, 'Practice Area updated successfully', updated);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to update Practice Area', error.message);
  }
};


export const deletePracticeArea = async (req, res) => {
  try {
    const deleted = await deletePracticeAreaService(req.params.id);
    generateResponse(res, 200, true, 'Practice Area deleted successfully', deleted);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to delete Practice Area', error.message);
  }
};

