import {
    sendMessageService,
    getMessagesByResourceService,
    getUserConversationsService
} from './message.service.js';
import { generateResponse } from '../../lib/responseFormate.js';
import Resource from '../resource/resource.model.js';



export const createMessage = async (req, res) => {
    try {
        const {resourceId, message} = req.body;
        const senderId = req.user._id;
        const messageData = {
            sender: senderId,
            message: message,
        };
        const savedMessage = await sendMessageService(resourceId, messageData);
        if (!savedMessage) {
            return generateResponse(res, 404, false, "Failed to create message");
        }
        generateResponse(res, 201, true, "Message created successfully", savedMessage);
        
    } catch (error) {
        generateResponse(res, 500, false, "Failed to create message", error.message);
        
    }
}


export const getUserConversations = async (req, res) => {
  try {
    if(req.user.role !== "ADMIN"){
        return generateResponse(res, 403, false, "You are not authorized to view these conversations");
    }   
    const result = await getUserConversationsService();

    generateResponse(res, 200, true, "Conversations fetched successfully", result);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch conversations", error.message);
  }
};


export const getMessagesByResource = async (req, res) => {
    try {
      const { resourceId } = req.params;
  
      const resource = await Resource.findById(resourceId);

      if (!resource) {
        return generateResponse(res, 404, false, "Resource not found");
      }
  
      const isOwner = resource.createdBy.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "ADMIN";
  
      if (!isOwner && !isAdmin) {
        return generateResponse(res, 403, false, "You are not authorized to view these messages");
      }
  
      const result = await getMessagesByResourceService(resourceId,req.user._id);
  
      generateResponse(res, 200, true, "Messages fetched successfully", result);
    } catch (error) {
      generateResponse(res, 500, false, "Failed to fetch messages", error.message);
    }
};