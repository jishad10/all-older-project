import { generateResponse } from '../../lib/responseFormate.js';
import {
  exportAccountsService,
  exportListingsService,
  exportRevenueService,
  exportAuditLogsService,
  getRecentExportsService,
} from './dataExport.service.js';


export const exportAccounts = async (req, res, next) => {
  try {
    const data = await exportAccountsService(req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Accounts export ready', data);
  } catch (error) { next(error); }
};

export const exportListings = async (req, res, next) => {
  try {
    const data = await exportListingsService(req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Listings export ready', data);
  } catch (error) { next(error); }
};

export const exportRevenue = async (req, res, next) => {
  try {
    const data = await exportRevenueService(req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Revenue export ready', data);
  } catch (error) { next(error); }
};

export const exportAuditLogs = async (req, res, next) => {
  try {
    const data = await exportAuditLogsService(req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'Audit logs export ready', data);
  } catch (error) { next(error); }
};

export const getRecentExports = async (req, res, next) => {
  try {
    const data = await getRecentExportsService();
    return generateResponse(res, 200, true, 'Recent exports fetched', data);
  } catch (error) { next(error); }
};