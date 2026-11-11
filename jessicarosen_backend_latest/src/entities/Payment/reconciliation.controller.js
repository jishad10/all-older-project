// src/entities/Payment/reconciliation.controller.js
import { generateResponse } from '../../lib/responseFormate.js';
import { reconcilePendingOrders } from './reconciliation.service.js';

export const reconcilePendingOrdersController = async (req, res) => {
  try {
    const olderThanMinutes = req.query.olderThanMinutes
      ? Number(req.query.olderThanMinutes)
      : undefined;
    const maxAgeDays = req.query.maxAgeDays ? Number(req.query.maxAgeDays) : undefined;

    const results = await reconcilePendingOrders({ olderThanMinutes, maxAgeDays });

    return generateResponse(res, 200, true, 'Reconciliation run complete', results);
  } catch (error) {
    console.error('Reconciliation controller error:', error);
    return generateResponse(res, 500, false, error.message || 'Reconciliation failed');
  }
};