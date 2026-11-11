import { generateResponse } from '../../lib/responseFormate.js';
import {
  getAvailabilityService,
  saveAvailabilityService,
  getBlockedDatesService,
  addBlockedDateService,
  deleteBlockedDateService,
  createAppointmentService,
  getMyAppointmentsService,
  getAvailableSlotsService,
  updateAppointmentStatusService,
  deleteAppointmentService,
  getAllAppointmentsService,
} from './appointment.service.js';


// ─── AVAILABILITY ───────────────────────────

export const getAvailability = async (req, res, next) => {
  try {
    const data = await getAvailabilityService(req.user._id);
    return generateResponse(res, 200, true, 'Availability fetched', data);
  } catch (error) { next(error); }
};

export const saveAvailability = async (req, res, next) => {
  try {
    const { schedule } = req.body;
    if (!schedule) return generateResponse(res, 400, false, 'Schedule is required', null);
    const data = await saveAvailabilityService(req.user._id, schedule);
    return generateResponse(res, 200, true, 'Availability saved', data);
  } catch (error) { next(error); }
};


// ─── BLOCKED DATES ───────────────────────────

export const getBlockedDates = async (req, res, next) => {
  try {
    const data = await getBlockedDatesService(req.user._id);
    return generateResponse(res, 200, true, 'Blocked dates fetched', data);
  } catch (error) { next(error); }
};

export const addBlockedDate = async (req, res, next) => {
  try {
    const data = await addBlockedDateService(req.user._id, req.body);
    return generateResponse(res, 201, true, 'Date blocked successfully', data);
  } catch (error) {
    if (error.message === 'Date is required')              return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Invalid date')                  return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'This date is already blocked')  return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};

export const deleteBlockedDate = async (req, res, next) => {
  try {
    await deleteBlockedDateService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Blocked date removed', null);
  } catch (error) {
    if (error.message === 'Blocked date not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};


// ─── APPOINTMENTS ────────────────────────────

export const createAppointment = async (req, res, next) => {
  try {
    // bookedBy = logged in user id if authenticated, else null (guest)
    const bookedBy = req.user?._id || null;
    const data = await createAppointmentService(req.body, bookedBy);
    return generateResponse(res, 201, true, 'Appointment created successfully', data);
  } catch (error) {
    const clientErrors = [
      'Property is required', 'Date is required', 'Time is required',
      'Customer name is required', 'Email is required', 'Phone number is required',
      'Invalid date', 'This date is not available',
      'Selected time is not in available slots for this day',
    ];
    if (clientErrors.includes(error.message)) return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Property not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const getMyAppointments = async (req, res, next) => {
  try {
    const { page, limit, status, date } = req.query;
    const data = await getMyAppointmentsService(req.user._id, { page, limit, status, date });
    return generateResponse(res, 200, true, 'Appointments fetched', data);
  } catch (error) { next(error); }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { propertyId, date } = req.query;
    const data = await getAvailableSlotsService(propertyId, date);
    return generateResponse(res, 200, true, 'Available slots fetched', data);
  } catch (error) {
    if (error.message === 'Property is required') return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Date is required')     return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Property not found')   return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await updateAppointmentStatusService(req.user._id, req.params.id, status);
    return generateResponse(res, 200, true, 'Appointment status updated', data);
  } catch (error) {
    if (error.message === 'Invalid status')        return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Appointment not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    await deleteAppointmentService(req.user._id, req.params.id);
    return generateResponse(res, 200, true, 'Appointment deleted', null);
  } catch (error) {
    if (error.message === 'Appointment not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const getAllAppointments = async (req, res, next) => {
  try {
    const { page, limit, status, date } = req.query;
    const data = await getAllAppointmentsService({ page, limit, status, date });
    return generateResponse(res, 200, true, 'All appointments fetched', data);
  } catch (error) { next(error); }
};