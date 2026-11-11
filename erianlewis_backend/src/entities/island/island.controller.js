import { generateResponse } from '../../lib/responseFormate.js';
import {
  createIsland,
  deleteIsland,
  getAllIslands,
  getIslandById,
  updateIsland,
  getIslandOverviewService,
  getIslandListingsService,
} from './island.service.js';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const createIslandController = async (req, res) => {
  try {
    const island = await createIsland(req.body);
    generateResponse(res, 201, true, 'Island created successfully', island);
  } catch (error) {
    const status = error.message.includes('exists') ? 400 : 500;
    generateResponse(res, status, false, error.message || 'Failed to create island', null);
  }
};

export const getAllIslandsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { islands, paginationInfo } = await getAllIslands({ page, limit, search, date });
    generateResponse(res, 200, true, 'Islands fetched successfully', { islands, paginationInfo });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch islands', null);
  }
};

export const getIslandByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const island = await getIslandById(id);
    generateResponse(res, 200, true, 'Island fetched successfully', island);
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    generateResponse(res, status, false, error.message || 'Failed to fetch island', null);
  }
};

export const updateIslandController = async (req, res) => {
  try {
    const { id } = req.params;
    const island = await updateIsland({ id, ...req.body });
    generateResponse(res, 200, true, 'Island updated successfully', island);
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    generateResponse(res, status, false, error.message || 'Failed to update island', null);
  }
};

export const deleteIslandController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteIsland(id);
    generateResponse(res, 200, true, 'Island deleted successfully', null);
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    generateResponse(res, status, false, error.message || 'Failed to delete island', null);
  }
};

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

export const getIslandOverview = async (req, res, next) => {
  try {
    const data = await getIslandOverviewService();
    generateResponse(res, 200, true, 'Island overview fetched', data);
  } catch (error) {
    next(error);
  }
};

// ─── LISTINGS ────────────────────────────────────────────────────────────────

export const getIslandListings = async (req, res, next) => {
  try {
    const { page, limit, listingType } = req.query;
    const data = await getIslandListingsService(req.params.id, { page, limit, listingType });
    generateResponse(res, 200, true, 'Island listings fetched', data);
  } catch (error) {
    next(error);
  }
};