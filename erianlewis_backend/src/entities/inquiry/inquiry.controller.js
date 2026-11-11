import { generateResponse } from '../../lib/responseFormate.js';
import {
  createInquiryService,
  getLandlordInquiriesService,
  getLandlordInquiryByIdService,
  replyToInquiryService,
  updateInquiryStatusService,
  adminGetAllInquiriesService,
  adminGetInquiryByIdService,
  addAdminNoteService,
  deleteAdminNoteService,
  adminDeleteInquiryService,
} from './inquiry.service.js';
import { getIpFromRequest } from '../../lib/ipLocation.js';


// ─── PUBLIC ──────────────────────────────────

export const createInquiry = async (req, res, next) => {
  try {
    const sentBy = req.user?._id || null;
    const ip     = getIpFromRequest(req);
    const data   = await createInquiryService(req.body, sentBy, ip);
    return generateResponse(res, 201, true, 'Inquiry sent successfully', data);
  } catch (error) {
    const clientErrors = [
      'Property is required', 'Full name is required',
      'Email is required', 'Message is required',
      'Property has no owner assigned',
    ];
    if (clientErrors.includes(error.message)) return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Property not found') return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Landlord not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


// ─── LANDLORD ────────────────────────────────

export const getLandlordInquiries = async (req, res, next) => {
  try {
    const { page, limit, status, propertyId } = req.query;
    const data = await getLandlordInquiriesService(req.user._id, { page, limit, status, propertyId });
    return generateResponse(res, 200, true, 'Inquiries fetched', data);
  } catch (error) { next(error); }
};

export const getLandlordInquiryById = async (req, res, next) => {
  try {
    const data = await getLandlordInquiryByIdService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Inquiry fetched', data);
  } catch (error) {
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const replyToInquiry = async (req, res, next) => {
  try {
    const { message } = req.body;
    const isAdmin = req.user.role === 'ADMIN';
    const data = await replyToInquiryService(req.user._id, req.params.id, message, isAdmin);
    return generateResponse(res, 200, true, 'Reply sent successfully', data);
  } catch (error) {
    if (error.message === 'Reply message is required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Inquiry not found')         return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const updateInquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await updateInquiryStatusService(req.user._id, req.params.id, status);
    return generateResponse(res, 200, true, 'Inquiry status updated', data);
  } catch (error) {
    if (error.message === 'Invalid status')    return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


// ─── ADMIN ───────────────────────────────────

export const adminGetAllInquiries = async (req, res, next) => {
  try {
    const { page, limit, status, propertyId, landlordId } = req.query;
    const data = await adminGetAllInquiriesService({ page, limit, status, propertyId, landlordId });
    return generateResponse(res, 200, true, 'All inquiries fetched', data);
  } catch (error) { next(error); }
};

export const adminGetInquiryById = async (req, res, next) => {
  try {
    const data = await adminGetInquiryByIdService(req.params.id);
    return generateResponse(res, 200, true, 'Inquiry fetched', data);
  } catch (error) {
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const addAdminNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const data = await addAdminNoteService(req.user._id, req.params.id, note);
    return generateResponse(res, 201, true, 'Note added', data);
  } catch (error) {
    if (error.message === 'Note is required')  return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const deleteAdminNote = async (req, res, next) => {
  try {
    await deleteAdminNoteService(req.user._id, req.params.id, req.params.noteId);
    return generateResponse(res, 200, true, 'Note deleted', null);
  } catch (error) {
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Note not found')    return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const adminDeleteInquiry = async (req, res, next) => {
  try {
    await adminDeleteInquiryService(req.params.id);
    return generateResponse(res, 200, true, 'Inquiry deleted', null);
  } catch (error) {
    if (error.message === 'Inquiry not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};