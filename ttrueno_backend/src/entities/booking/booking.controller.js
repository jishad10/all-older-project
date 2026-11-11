import {
  getBookingByIdService,
  getMyBookingsService,
  getRideBookingsService,
  updateBookingService
} from './booking.service.js';
import { generateResponse } from '../../lib/responseFormate.js';


export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const { bookings, pagination } = await getMyBookingsService(
      userId,
      status,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      status: "success",
      message: "My bookings fetched",
      data: bookings,
      pagination
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      data: null
    });
  }
};



export const getRideBookings = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;
    const bookings = await getRideBookingsService(rideId, userId);
    generateResponse(res, 200, 'success', 'Ride bookings fetched', bookings);
  } catch (err) {
    generateResponse(res, 403, 'error', err.message, null);
  }
};


export const updateBooking = async (req, res) => {
  try {
    const { status, baggageType } = req.body;
    const bookingId = req.params.bookingId;
    const userId = req.user._id;

    const updated = await updateBookingService(bookingId, userId, status, baggageType);

    generateResponse(res, 200, 'success', 'Booking updated', updated);
  } catch (err) {
    generateResponse(res, 400, 'error', err.message, null);
  }
};


export const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.user._id;
    const booking = await getBookingByIdService(bookingId, userId);
    generateResponse(res, 200, 'success', 'Booking retrieved', booking);
  } catch (err) {
    generateResponse(res, 404, 'error', err.message, null);
  }
};


