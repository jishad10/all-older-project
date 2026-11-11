import { createContactMessageService } from './contact.service.js';
import { generateResponse } from '../../lib/responseFormate.js';

export const submitContactMessage = async (req, res) => {
  try {
    const saved = await createContactMessageService(req.body);
    generateResponse(res, 201, true, 'Message received successfully', saved);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to submit message', error.message);
  }
};
