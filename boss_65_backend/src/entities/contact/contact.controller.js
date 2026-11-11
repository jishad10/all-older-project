import { createContactMessageService, getAllContactMessagesService, getContactMessageByIdService } from './contact.service.js';
import { generateResponse } from '../../lib/responseFormate.js';


export const submitContactMessage = async (req, res) => {
  try {
    const saved = await createContactMessageService(req.body);
    generateResponse(res, 201, true, 'Message received successfully', saved);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to submit message', error.message);
  }
};


export const getAllContactMessages = async (req, res) => {
  try {
    const messages = await getAllContactMessagesService();
    generateResponse(res, 200, true, 'Messages fetched successfully', messages);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch messages', error.message);
  }
};


export const getContactMessageById = async (req, res) => {
  try {
    const message = await getContactMessageByIdService(req.params.id);
    if (!message) {
      return generateResponse(res, 404, false, 'Message not found');
    }
    generateResponse(res, 200, true, 'Message fetched successfully', message);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch message', error.message);
  }
};