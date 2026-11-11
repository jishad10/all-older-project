import { CustomContact } from "./customContactModel.js";

export const getAllCustomContactsService = async () => {
  const customContacts = await CustomContact.find().sort({ createdAt: -1 }).limit(1);
  return customContacts;
};

export const getCustomContactByIdService = async (id) => {
  const customContact = await CustomContact.findById(id);
  if (!customContact) {
    throw new Error("Custom contact not found");
  }
  return customContact;
};

export const createCustomContactService = async (data) => {
  const customContact = new CustomContact(data);
  return await customContact.save();
};

export const updateCustomContactService = async (id, data) => {
  const customContact = await CustomContact.findByIdAndUpdate(id, data, { new: true });
  if (!customContact) {
    throw new Error("Custom contact not found");
  }
  return customContact;
};

export const deleteCustomContactService = async (id) => {
  const customContact = await CustomContact.findByIdAndDelete(id);
  if (!customContact) {
    throw new Error("Custom contact not found");
  }
  return customContact;
};
