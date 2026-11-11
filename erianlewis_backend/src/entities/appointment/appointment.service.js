import Appointment, { Availability, BlockedDate } from './appointment.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import { createPaginationInfo } from '../../lib/pagination.js';

const parseTimeToMinutes = (value) => {
  if (!value) return null;

  const normalized = String(value).trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  if (meridiem) {
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
  }

  return hours * 60 + minutes;
};

const isTimeWithinSlot = (time, slot) => {
  const timeMinutes = parseTimeToMinutes(time);
  const startMinutes = parseTimeToMinutes(slot?.start);
  const endMinutes = parseTimeToMinutes(slot?.end);

  if (
    timeMinutes === null ||
    startMinutes === null ||
    endMinutes === null
  ) {
    return time >= slot.start && time < slot.end;
  }

  // If end is earlier than start, treat the slot as spanning to midnight.
  if (endMinutes <= startMinutes) {
    return timeMinutes >= startMinutes || timeMinutes < endMinutes;
  }

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};


// ─────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────

/**
 * Get weekly availability for an owner
 * Creates empty schedule if none exists yet
 */
export const getAvailabilityService = async (ownerId) => {
  let availability = await Availability.findOne({ owner: ownerId });

  if (!availability) {
    availability = await Availability.create({ owner: ownerId, schedule: {} });
  }

  return availability;
};


/**
 * Save full weekly schedule
 * Body: { schedule: { monday: [{start, end}], tuesday: [...], ... } }
 */
export const saveAvailabilityService = async (ownerId, schedule) => {
  const availability = await Availability.findOneAndUpdate(
    { owner: ownerId },
    { schedule },
    { new: true, upsert: true, runValidators: true }
  );
  return availability;
};


// ─────────────────────────────────────────────
// BLOCKED DATES
// ─────────────────────────────────────────────

export const getBlockedDatesService = async (ownerId) => {
  return BlockedDate.find({ owner: ownerId }).sort({ date: 1 });
};


export const addBlockedDateService = async (ownerId, { date, reason }) => {
  if (!date) throw new Error('Date is required');

  const d = new Date(date);
  if (isNaN(d.getTime())) throw new Error('Invalid date');

  // prevent duplicates
  const existing = await BlockedDate.findOne({ owner: ownerId, date: d });
  if (existing) throw new Error('This date is already blocked');

  return BlockedDate.create({ owner: ownerId, date: d, reason: reason || '' });
};


export const deleteBlockedDateService = async (ownerId, blockedDateId) => {
  const doc = await BlockedDate.findOne({ _id: blockedDateId, owner: ownerId });
  if (!doc) throw new Error('Blocked date not found');
  await BlockedDate.findByIdAndDelete(blockedDateId);
  return true;
};


// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────

/**
 * Create appointment
 * Validates:
 * - property exists and belongs to an active landlord/agent
 * - date is not blocked
 * - time slot is in owner's availability
 */
export const createAppointmentService = async (payload, bookedBy = null) => {
  const { propertyId, date, time, customerName, email, phone, notes } = payload;

  if (!propertyId)    throw new Error('Property is required');
  if (!date)          throw new Error('Date is required');
  if (!time)          throw new Error('Time is required');
  if (!customerName)  throw new Error('Customer name is required');
  if (!email)         throw new Error('Email is required');
  if (!phone)         throw new Error('Phone number is required');

  const property = await RentalProperty.findById(propertyId);
  if (!property) throw new Error('Property not found');
  if (!property.createdBy) throw new Error("Property has no owner. Please re-create the property while logged in.");

  const ownerId = property.createdBy;
  const appointmentDate = new Date(date);
  if (isNaN(appointmentDate.getTime())) throw new Error('Invalid date');

  // Check date not blocked
  const isBlocked = await BlockedDate.findOne({
    owner: ownerId,
    date: {
      $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
      $lt:  new Date(appointmentDate.setHours(23, 59, 59, 999)),
    },
  });
  if (isBlocked) throw new Error('This date is not available');

  // Check time is in owner availability
  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date(date).getDay()];
  const availability = await Availability.findOne({ owner: ownerId });

  if (availability?.schedule?.[dayName]?.length) {
    const slots = availability.schedule[dayName];
    const inSlot = slots.some(slot => isTimeWithinSlot(time, slot));
    if (!inSlot) throw new Error('Selected time is not in available slots for this day');
  }

  const appointment = await Appointment.create({
    property: propertyId,
    owner:    ownerId,
    bookedBy: bookedBy || null,
    customerName,
    email,
    phone,
    date: new Date(date),
    time,
    notes: notes || '',
  });

  return appointment.populate(['property', 'owner']);
};


/**
 * Get appointments for the logged-in owner (landlord/agent)
 */
export const getMyAppointmentsService = async (ownerId, { page = 1, limit = 10, status, date, propertyId }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = { owner: ownerId };
  if (status)     filter.status   = status;
  if (propertyId) filter.property = propertyId;
  if (date) {
    const d = new Date(date);
    filter.date = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lt:  new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const total = await Appointment.countDocuments(filter);
  const appointments = await Appointment.find(filter)
    .populate('property', 'basicInformation.propertyTitle location.island')
    .populate('bookedBy', 'firstName lastName email')
    .sort({ date: 1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  // counts for dashboard cards
  const [allCount, pendingCount, confirmedCount, completedCount, cancelledCount] = await Promise.all([
    Appointment.countDocuments({ owner: ownerId }),
    Appointment.countDocuments({ owner: ownerId, status: 'pending' }),
    Appointment.countDocuments({ owner: ownerId, status: 'confirmed' }),
    Appointment.countDocuments({ owner: ownerId, status: 'completed' }),
    Appointment.countDocuments({ owner: ownerId, status: 'cancelled' }),
  ]);

  return {
    counts: {
      all:       allCount,
      pending:   pendingCount,
      confirmed: confirmedCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    appointments,
    paginationInfo: createPaginationInfo(numericPage, numericLimit, total),
  };
};


/**
 * Get available time slots for a property on a specific date
 * Used by frontend to populate the time dropdown
 */
export const getAvailableSlotsService = async (propertyId, date) => {
  if (!propertyId) throw new Error('Property is required');
  if (!date)       throw new Error('Date is required');

  const property = await RentalProperty.findById(propertyId);
  if (!property) throw new Error('Property not found');

  const ownerId = property.createdBy;
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new Error('Invalid date');

  // Check if date is blocked
  const isBlocked = await BlockedDate.findOne({
    owner: ownerId,
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt:  new Date(new Date(date).setHours(23, 59, 59, 999)),
    },
  });
  if (isBlocked) return { available: false, reason: 'Date is blocked', slots: [] };

  // Get owner availability for this day
  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()];
  const availability = await Availability.findOne({ owner: ownerId });
  const slots = availability?.schedule?.[dayName] || [];

  if (!slots.length) return { available: false, reason: 'No availability set for this day', slots: [] };

  // Get already booked times on this date
  const booked = await Appointment.find({
    property: propertyId,
    status: { $in: ['pending', 'confirmed'] },
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt:  new Date(new Date(date).setHours(23, 59, 59, 999)),
    },
  }).select('time');

  const bookedTimes = booked.map(a => a.time);
  const availableSlots = slots.filter(slot => !bookedTimes.includes(slot.start));

  return { available: true, slots: availableSlots, bookedTimes };
};


/**
 * Update appointment status (owner only)
 */
export const updateAppointmentStatusService = async (ownerId, appointmentId, status) => {
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');

  const appointment = await Appointment.findOne({ _id: appointmentId, owner: ownerId });
  if (!appointment) throw new Error('Appointment not found');

  appointment.status = status;
  await appointment.save();

  return appointment;
};


/**
 * Delete appointment (owner only)
 */
export const deleteAppointmentService = async (ownerId, appointmentId) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, owner: ownerId });
  if (!appointment) throw new Error('Appointment not found');
  await Appointment.findByIdAndDelete(appointmentId);
  return true;
};


/**
 * Admin — get all appointments
 */
export const getAllAppointmentsService = async ({ page = 1, limit = 10, status, date }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {};
  if (status) filter.status = status;
  if (date) {
    const d = new Date(date);
    filter.date = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lt:  new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const total = await Appointment.countDocuments(filter);
  const appointments = await Appointment.find(filter)
    .populate('property', 'basicInformation.propertyTitle')
    .populate('owner',    'firstName lastName email role')
    .populate('bookedBy', 'firstName lastName email')
    .sort({ date: 1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { appointments, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};
