import { generateResponse } from '../../lib/responseFormate.js';
import {
  getSavedSearchService,
  getSavedSearchesService,
  createSavedSearchService,
  updateSavedSearchService,
  deleteSavedSearchService,
} from './savedSearch.service.js';

export const getSavedSearch = async (req, res, next) => {
  try {
    const data = await getSavedSearchService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Saved search fetched', data);
  } catch (error) {
    if (error.message === 'Saved search not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const getSavedSearches = async (req, res, next) => {
  try {
    const data = await getSavedSearchesService(req.user._id);
    return generateResponse(res, 200, true, 'Saved searches fetched', data);
  } catch (error) { next(error); }
};

export const createSavedSearch = async (req, res, next) => {
  try {
    const data = await createSavedSearchService(req.user._id, req.body);
    return generateResponse(res, 201, true, 'Search saved', data);
  } catch (error) {
    if (error.message === 'Search name is required') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};

export const updateSavedSearch = async (req, res, next) => {
  try {
    const data = await updateSavedSearchService(req.user._id, req.params.id, req.body);
    return generateResponse(res, 200, true, 'Saved search updated', data);
  } catch (error) {
    if (error.message === 'Saved search not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const deleteSavedSearch = async (req, res, next) => {
  try {
    await deleteSavedSearchService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Saved search deleted', null);
  } catch (error) {
    if (error.message === 'Saved search not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};
