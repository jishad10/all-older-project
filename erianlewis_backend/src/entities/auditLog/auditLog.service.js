import AuditLog from './auditLog.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import { createPaginationInfo } from '../../lib/pagination.js';


export const getAuditLogsService = async ({ page = 1, limit = 50, entityType, action, island }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 50;

  const filter = {};
  if (entityType && entityType !== 'all') filter['entity.type'] = entityType;
  if (action     && action !== 'all')     filter.action         = action;

  // island filter — find properties on that island, then filter logs by those entity IDs
  if (island) {
    const properties = await RentalProperty.find({ 'address.island': island }).select('_id');
    const propertyIds = properties.map(p => p._id);
    filter['entity.id'] = { $in: propertyIds };
  }

  const total = await AuditLog.countDocuments(filter);

  const logs = await AuditLog.find(filter)
    .populate('actor.userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { logs, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


export const getAuditLogByIdService = async (id) => {
  const log = await AuditLog.findById(id).populate('actor.userId', 'firstName lastName email role');
  if (!log) throw new Error('Audit log not found');
  return log;
};