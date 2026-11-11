import { generateResponse } from '../../lib/responseFormate.js';
import { getAuditLogsService, getAuditLogByIdService } from './auditLog.service.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, entityType, action, island } = req.query;
    const data = await getAuditLogsService({ page, limit, entityType, action, island });
    return generateResponse(res, 200, true, 'Audit logs fetched', data);
  } catch (error) { next(error); }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const data = await getAuditLogByIdService(req.params.id);
    return generateResponse(res, 200, true, 'Audit log fetched', data);
  } catch (error) {
    if (error.message === 'Audit log not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};