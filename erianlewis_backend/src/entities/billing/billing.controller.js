import { generateResponse } from '../../lib/responseFormate.js';
import { getBillingService, getBillingDetailService } from './billing.service.js';


export const getBilling = async (req, res, next) => {
  try {
    const { page, limit, search, planId, billingCycle } = req.query;
    const data = await getBillingService({ page, limit, search, planId, billingCycle });
    return generateResponse(res, 200, true, 'Billing records fetched', data);
  } catch (error) { next(error); }
};


export const getBillingDetail = async (req, res, next) => {
  try {
    const data = await getBillingDetailService(req.params.userId);
    return generateResponse(res, 200, true, 'Billing detail fetched', data);
  } catch (error) {
    if (error.message === 'User not found')                  return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'User has no active subscription') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};