import { generateResponse } from "../../lib/responseFormate.js";
import { createOrUpdateCmsPageService, getAllCmsPagesService, getCmsPageService } from "./cms.controller.js";


export const createOrUpdateCmsPage = async (req, res, next) => {
  try {
    const data = await createOrUpdateCmsPageService(req.body);
    generateResponse(res, 200, true, 'CMS page saved successfully', data);
  } catch (error) {
    if (error.message === 'Page and description are required') {
      generateResponse(res, 400, false, error.message, null);
    } else if (error.message === 'Invalid page type') {
      generateResponse(res, 400, false, error.message, null);
    } else {
      next(error);
    }
  }
};


export const getCmsPage = async (req, res, next) => {
  try {
    const data = await getCmsPageService(req.params.page);
    generateResponse(res, 200, true, 'CMS page fetched successfully', data);
  } catch (error) {
    if (error.message === 'Page not found') {
      generateResponse(res, 404, false, error.message, null);
    } else if (error.message === 'Invalid page type') {
      generateResponse(res, 400, false, error.message, null);
    } else {
      next(error);
    }
  }
};


export const getAllCmsPages = async (req, res, next) => {
  try {
    const data = await getAllCmsPagesService();
    generateResponse(res, 200, true, 'CMS pages fetched successfully', data);
  } catch (error) {
    next(error);
  }
};