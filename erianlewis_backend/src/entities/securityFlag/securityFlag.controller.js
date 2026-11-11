import { generateResponse } from '../../lib/responseFormate.js';
import {
  getAllFlagsService,
  getFlagByIdService,
  createFlagService,
  updateFlagService,
  resolveFlagService,
  unresolveFlagService,
  deleteFlagService,
  searchUsersForFlagService,
} from './securityFlag.service.js';


export const getAllFlags = async (req, res, next) => {
  try {
    const { page, limit, status, severity, userId } = req.query;
    const data = await getAllFlagsService({ page, limit, status, severity, userId });
    return generateResponse(res, 200, true, 'Security flags fetched', data);
  } catch (error) { next(error); }
};


export const getFlagById = async (req, res, next) => {
  try {
    const data = await getFlagByIdService(req.params.id);
    return generateResponse(res, 200, true, 'Security flag fetched', data);
  } catch (error) {
    if (error.message === 'Security flag not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const createFlag = async (req, res, next) => {
  try {
    const data = await createFlagService(req.user._id, req.user.email, req.body);
    return generateResponse(res, 201, true, 'Security flag created', data);
  } catch (error) {
    const clientErrors = [
      'User is required', 'Flag type is required',
      'Severity is required', 'Invalid severity',
    ];
    if (clientErrors.includes(error.message)) return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'User not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const updateFlag = async (req, res, next) => {
  try {
    const data = await updateFlagService(req.params.id, req.body);
    return generateResponse(res, 200, true, 'Security flag updated', data);
  } catch (error) {
    if (error.message === 'Security flag not found') return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Invalid severity')        return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const resolveFlag = async (req, res, next) => {
  try {
    const data = await resolveFlagService(req.params.id, req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Flag resolved', data);
  } catch (error) {
    if (error.message === 'Security flag not found') return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Flag is already resolved') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const unresolveFlag = async (req, res, next) => {
  try {
    const data = await unresolveFlagService(req.params.id);
    return generateResponse(res, 200, true, 'Flag reopened', data);
  } catch (error) {
    if (error.message === 'Security flag not found') return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Flag is not resolved')    return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


export const deleteFlag = async (req, res, next) => {
  try {
    await deleteFlagService(req.params.id);
    return generateResponse(res, 200, true, 'Security flag deleted', null);
  } catch (error) {
    if (error.message === 'Security flag not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


export const searchUsersForFlag = async (req, res, next) => {
  try {
    const { search } = req.query;
    const data = await searchUsersForFlagService(search);
    return generateResponse(res, 200, true, 'Users fetched', data);
  } catch (error) {
    if (error.message === 'Search term is required') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};