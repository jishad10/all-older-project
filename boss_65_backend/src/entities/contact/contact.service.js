import mongoose from 'mongoose';
import ContactMessage from './contact.model.js';


export const createContactMessageService = async (data) => {
  const contact = new ContactMessage(data);
  return await contact.save();
};


export const getAllContactMessagesService = async () => {
  return await ContactMessage.find().sort({ createdAt: -1 });
};


export const getContactMessageByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await ContactMessage.findById(id);
};