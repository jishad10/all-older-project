import { generateResponse } from '../../lib/responseFormate.js';

import {
  createPlanService,
  getPlansService,
  getPlanByIdService,
  updatePlanService,
  deletePlanService,
  getRecentTransactionsService,
  getRecentTransactionByIdService,
  getMembershipsService
} from './plan.service.js';
import { createPlanSchema, updatePlanSchema } from './plan.validation.js';


export const createPlanController = async (req, res, next) => {
  try {
    const { error, value } = createPlanSchema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      return generateResponse(res, 400, false, error.details.map(d => d.message));
    }

    const plan = await createPlanService(value);
    return generateResponse(res, 201, true, "Plan created", plan);
  } catch (err) {
    next(err);
  }
};


export const getPlansController = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;
    const data = await getPlansService({ page, limit, search, status });
    return generateResponse(res, 200, true, 'Plans fetched', data);
  } catch (err) {
    next(err);
  }
};

export const getPlanByIdController = async (req, res, next) => {
  try {
    const plan = await getPlanByIdService(req.params.id);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    return generateResponse(res, 200, true, 'Plan fetched', plan);
  } catch (err) {
    next(err);
  }
};

export const updatePlanController = async (req, res, next) => {
  try {
    const { error, value } = updatePlanSchema.validate(req.body);
    if (error) return generateResponse(res, 400, false, error.message);

    const plan = await updatePlanService(req.params.id, value);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    return generateResponse(res, 200, true, 'Plan updated', plan);
  } catch (err) {
    next(err);
  }
};

export const deletePlanController = async (req, res, next) => {
  try {
    const plan = await deletePlanService(req.params.id);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    return generateResponse(res, 200, true, 'Plan deleted', plan);
  } catch (err) {
    next(err);
  }
};

export const getRecentTransactionsController = async (req, res, next) => {
  try {
    const data = await getRecentTransactionsService();
    return generateResponse(res, 200, true, "Recent transactions fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getRecentTransactionByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await getRecentTransactionByIdService(id);

    if (!data) {
      return generateResponse(res, 404, false, "Transaction not found", null);
    }

    return generateResponse(res, 200, true, "Transaction details fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getMembershipsController = async (req, res, next) => {
  try {
    const { page, limit, search, status, planId } = req.query;

    const data = await getMembershipsService({ page, limit, search, status, planId });
    return generateResponse(res, 200, true, "Memberships fetched", data);
  } catch (err) {
    next(err);
  }
};



