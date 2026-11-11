// src/modules/contact/contact.controller.js
import mongoose from 'mongoose';
import {
  createContactService,
  getContactsService,
  getContactByIdService,
  updateContactService,
  deleteContactService,
} from './contact.service.js';

// Public: create contact message
export const createContact = async (req, res) => {
  try {
    const contact = await createContactService(req.body);
    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: contact,
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create contact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: list contacts with pagination/search
export const getContacts = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const result = await getContactsService({ page, limit, search });

    return res.status(200).json({
      success: true,
      message: 'Contacts fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: get single contact
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid contact id' });
    }

    const contact = await getContactByIdService(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact fetched successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Get contact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: update contact
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid contact id' });
    }

    const result = await updateContactService(id, req.body);

    if (result?.notFound) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: result.contact,
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Update contact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: delete contact
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid contact id' });
    }

    const result = await deleteContactService(id);
    if (result?.notFound) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    return res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};