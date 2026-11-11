import { generateResponse } from '../../lib/responseFormate.js';
import { getCommandCentreService } from './commandCentre.service.js';

export const getCommandCentre = async (req, res, next) => {
  try {
    const data = await getCommandCentreService();
    return generateResponse(res, 200, true, 'Command centre data fetched', data);
  } catch (error) { next(error); }
};