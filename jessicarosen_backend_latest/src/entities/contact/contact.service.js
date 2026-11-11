import ContactMessage from './contact.model.js';

export const createContactMessageService = async (data) => {
  const contact = new ContactMessage(data);
  return await contact.save();
};
