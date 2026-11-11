import PromoCode from '../promo_code/promo_code.model.js';
import Booking from './booking.model.js';
import Service from '../admin/Services/createServices.model.js';
import { slotGenerator } from '../../lib/slotGenerator.js';
import { createPaginationInfo } from '../../lib/pagination.js';


export const createBookingService = async (data) => {
    const {
        user,
        date,
        timeSlots,
        service: serviceId,
        room:roomId,
        promoCode,
        numberOfPeople,
    } = data;

    // Validate date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) throw new Error('Invalid date');

    const service = await Service.findById(serviceId);
    console.log(service);
    if (!service) throw new Error('Service not found');
// test12
// STEP 1: Check if selected slots are still available
const { slots: availableSlots } = await checkAvailabilityService(date, serviceId,roomId);

for (let requestedSlot of timeSlots) {
    const match = availableSlots.find(
        slot =>
            slot.start === requestedSlot.start &&
            slot.end === requestedSlot.end &&
            slot.available === true
    );
    if (!match) {
        throw new Error(`Slot ${requestedSlot.start} - ${requestedSlot.end} is no longer available.`);
    }
}


    // STEP 2: Calculate total price based on number of people
    const pricePerSlot = service.pricePerSlot || 0;
    let total = pricePerSlot * timeSlots.length * numberOfPeople;




    // const durationPerSlot = service.slotDurationHours; // in hours
    // const basePricePerHour = service.pricePerSlot || 0;
    // const totalHours = timeSlots.length * durationPerSlot;
    // let total = basePricePerHour * totalHours;


    

    // STEP 3: Apply promo code if applicable
    let appliedPromo = null;
    if (promoCode) {
        const promo = await PromoCode.findOne({ code: promoCode, active: true });
        if (!promo) throw new Error('Invalid promo code');

        if (promo.expiresAt && promo.expiresAt < new Date()) {
            throw new Error('Promo code expired');
        }

        if (promo.discountType === 'Percentage') {
            total = total - total * (promo.discountValue / 100);
        } else if (promo.discountType === 'fixed') {
            total = total - promo.discountValue;
        }

        if (total < 0) total = 0;
        appliedPromo = promo._id;


    }

     // STEP 4: Check and apply free slot logic
    // -----------------------------

    // Count how many confirmed bookings user already has (excluding cancelled/refunded)
    const finalizedBookingCount = await Booking.countDocuments({
        'user.email': user.email.toLowerCase(),
        status: 'confirmed'
    });

    // Calculate how many free slots user should have earned
    const freeSlotsShouldHave = Math.floor(finalizedBookingCount / 10);

    // Get how many free slots user was awarded in previous bookings
    // We find the latest booking with freeSlotsAwarded to get the number
    const latestBooking = await Booking.findOne({ 'user.email': user.email.toLowerCase() })
      .sort({ createdAt: -1 });

    const freeSlotsAwarded = latestBooking?.freeSlotsAwarded || 0;

    // If user should have more free slots than awarded, apply free booking now
    if (freeSlotsShouldHave > freeSlotsAwarded) {
        // Apply discount for only one slot
  const discount = service.pricePerSlot;
  total = Math.max(0, total - discount);
    }
    total= parseFloat(total.toFixed(2));

    // STEP 5: Create Booking
    const booking = await Booking.create({
        user: {
            ...user,
            numberOfPeople
        },
        date: bookingDate,
        timeSlots,
        service: serviceId,
        room:roomId,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        promoCode: appliedPromo || undefined,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        freeSlotsAwarded: freeSlotsShouldHave > freeSlotsAwarded ? freeSlotsAwarded + 1 : freeSlotsAwarded
    });
    return booking;
};


export const getBookingById = async (id) => {
  const booking = await Booking.findById(id)
    .populate('service')
    .populate('room')        
    .populate('promoCode')
    .populate('category');  

  if (!booking) throw new Error('Booking not found');
  return booking;
};



// search bookings by date range and status

const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const isValidStatus = (status) => {
  return ['confirmed', 'cancelled', 'refunded'].includes(status);
};

export const getAllBookings = async ({ startDate, endDate, status } = {}, { page = 1, limit = 10 } = {}) => {
  const query = {};

  // Handle date range filtering
  if (startDate || endDate) {
    if (startDate && !isValidDate(startDate)) throw new Error("Invalid startDate format.");
    if (endDate && !isValidDate(endDate)) throw new Error("Invalid endDate format.");

    query.date = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.date.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }
  query.status = { $ne: "pending" }; // Exclude deleted bookings
  query.paymentStatus = { $ne: "pending" }; // Exclude deleted bookings

  // Handle status filtering
  if (status) {
    if (!isValidStatus(status)) throw new Error("Invalid booking status.");
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [totalData, bookings] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query)
      .populate('room')
      .populate('service')
      .populate('promoCode')
      .populate({
        path: 'service',
        populate: { path: 'category' } 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  const pagination = createPaginationInfo(page, limit, totalData);

  return {
    bookings,
    pagination,
  };
};




export const updateBooking = async (id, status) => {
  const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'refunded'];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed values are: ${allowedStatuses.join(', ')}`);
  }

  const booking = await Booking.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )

  if (!booking) throw new Error("Booking not found or update failed");
  return booking;
};


export const deleteBooking = async (id) => {
  const deleted = await Booking.findByIdAndDelete(id);
  if (!deleted) throw new Error('Booking not found or already deleted');
  return true;
};

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  if (t === "00:00") return 1440;
  return h * 60 + m;
}




// generating time slots and checking the time slots are availabel or not
export const checkAvailabilityService = async (date, serviceId,roomId) => {
    const service = await Service.findById(serviceId);
    if (!service) throw new Error('Service not found');

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) throw new Error('Invalid date');

    const weekday = bookingDate.toLocaleDateString('en-SG', { weekday: 'short' });

    // If service is not available on this day, return a signal to the controller
    if (!service.availableDays.includes(weekday)) {
        return { available: false, slots: [], weekday };
    }

const slots = slotGenerator(
  date,
  service.timeRange.start,
  service.timeRange.end,
  service.slotDurationHours
);


    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        room:roomId,
        service: serviceId,
        status: { $in: ['pending', 'confirmed'] }
    });
    

    if (existingBookings.length === 0) {
        return { available: true, slots: slots.map(slot => ({ ...slot, available: true })) };
    }

    const bookedSlots = existingBookings.flatMap(b => b.timeSlots);

    const availableSlots = slots.map(slot => {
  const slotStartMin = timeToMinutes(slot.start);
  const slotEndMin = timeToMinutes(slot.end);

  const isBooked = bookedSlots.some(b => {
    const bookedStartMin = timeToMinutes(b.start);
    const bookedEndMin = timeToMinutes(b.end);
    return slotStartMin < bookedEndMin && slotEndMin > bookedStartMin;
  });

  return { ...slot, available: !isBooked };
});


    return { available: true, slots: availableSlots };
};




