import { generateResponse } from '../../lib/responseFormate.js';
import { createAuditLog } from '../auditLog/auditLog.helper.js';

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


export const createPlanController = async (req, res, next) => {
  try {
    const plan = await createPlanService(req.body);
    await createAuditLog({
      actor:   { userId: req.user._id, email: req.user.email, role: req.user.role },
      action:  'plan_created',
      entity:  { type: 'plan', id: plan._id, label: plan.name || plan.title },
      details: { name: plan.name, price: plan.price },
    });
    return generateResponse(res, 201, true, 'Plan created', plan);
  } catch (err) {
    next(err);
  }
};

export const getPlansController = async (req, res, next) => {
  try {
    const { page, limit, search, status, role } = req.query;
    const data = await getPlansService({ page, limit, search, status, role });
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
    const plan = await updatePlanService(req.params.id, req.body);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    await createAuditLog({
      actor:   { userId: req.user._id, email: req.user.email, role: req.user.role },
      action:  'plan_updated',
      entity:  { type: 'plan', id: plan._id, label: plan.name || plan.title },
      details: { changes: req.body },
    });
    return generateResponse(res, 200, true, 'Plan updated', plan);
  } catch (err) {
    next(err);
  }
};

export const deletePlanController = async (req, res, next) => {
  try {
    const plan = await deletePlanService(req.params.id);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    await createAuditLog({
      actor:   { userId: req.user._id, email: req.user.email, role: req.user.role },
      action:  'plan_deleted',
      entity:  { type: 'plan', id: plan._id, label: plan.name || plan.title },
      details: { name: plan.name },
    });
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