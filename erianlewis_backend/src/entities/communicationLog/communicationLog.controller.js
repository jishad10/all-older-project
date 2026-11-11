import { generateResponse } from '../../lib/responseFormate.js';
import { getCommunicationLogsService } from './communicationLog.service.js';

export const getCommunicationLogs = async (req, res, next) => {
  try {
    const { page, limit, search, type, startDate, endDate, island } = req.query;
    const data = await getCommunicationLogsService({ page, limit, search, type, startDate, endDate, island });
    return generateResponse(res, 200, true, 'Communication logs fetched', data);
  } catch (error) { next(error); }
};