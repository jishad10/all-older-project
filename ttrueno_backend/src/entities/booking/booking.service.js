import Booking from './booking.model.js';
import Ride from '../ride/ride.model.js';
import Rating from '../rating/rating.model.js';
import mongoose from 'mongoose';


export const getMyBookingsService = async (userId, status, page = 1, limit = 10) => {
  const query = { user: userId };
  if (status) query.status = status;

  const allBookings = await Booking.find(query)
    .populate({
      path: 'ride',
      populate: [
        { path: 'creator', select: 'name email profileImage' },
        {
          path: 'chatRoom',
          populate: {
            path: 'participants',
            select: 'name email profileImage phoneNumber'
          }
        }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  const uniqueBookingsMap = new Map();
  for (const booking of allBookings) {
    const rideId = booking.ride?._id?.toString();
    if (!rideId) continue;
    if (!uniqueBookingsMap.has(rideId)) {
      uniqueBookingsMap.set(rideId, booking);
    }
  }

  const uniqueBookings = Array.from(uniqueBookingsMap.values());
  const totalData = uniqueBookings.length;
  const totalPages = Math.ceil(totalData / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedBookings = uniqueBookings.slice(startIndex, startIndex + limit);

  const rideIds = paginatedBookings.map((b) => b.ride?._id).filter(Boolean);

  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: { $in: rideIds.map((id) => new mongoose.Types.ObjectId(id)) }
      }
    },
    {
      $group: {
        _id: { ride: '$ride', ratedUser: '$ratedUser' },
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  const ratingMap = {};
  ratings.forEach((r) => {
    const rideId = r._id.ride.toString();
    const ratedUserId = r._id.ratedUser.toString();
    if (!ratingMap[rideId]) ratingMap[rideId] = {};
    ratingMap[rideId][ratedUserId] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.ratingCount
    };
  });

  const enrichedBookings = await Promise.all(
    paginatedBookings.map(async (booking) => {
      const ride = booking.ride;
      const rideId = ride?._id?.toString();
      if (!rideId) return booking;

      // Fetch ALL participants — both active AND completed — so finished
      // users are still visible on the rating screen for remaining passengers
      const participants = await Booking.find({
        ride: rideId,
        status: { $in: ['active', 'completed'] }
      })
        .populate('user', 'name profileImage')
        .lean();

      const formattedParticipants = participants.map((p) => {
        const user = p.user;
        const userRatings = ratingMap[rideId]?.[user._id.toString()] || {};
        return {
          userId: user._id,
          name: user.name,
          profileImage: user.profileImage || '',
          seatBooked: p.seatBooked,
          baggageType: p.baggageType,
          avgRating: userRatings.avgRating ? Number(userRatings.avgRating) : 0
        };
      });

      const { user, seatBooked, baggageType, ...bookingRest } = booking;

      return {
        ...bookingRest,
        ride: {
          ...ride,
          creator: ride.creator
            ? {
                _id: ride.creator._id,
                name: ride.creator.name,
                email: ride.creator.email,
                profileImage: ride.creator.profileImage || ''
              }
            : null,
          chatRoom: ride.chatRoom
            ? {
                _id: ride.chatRoom._id,
                name: ride.chatRoom.name,
                participants: ride.chatRoom.participants.map((p) => ({
                  _id: p._id,
                  name: p.name,
                  email: p.email,
                  profileImage: p.profileImage || '',
                  phoneNumber: p.phoneNumber || ''
                }))
              }
            : null,
          participants: formattedParticipants,
          participantsCount: formattedParticipants.length
        }
      };
    })
  );

  return {
    bookings: enrichedBookings,
    pagination: {
      currentPage: page,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};


export const getRideBookingsService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error('Ride not found');
  if (!ride.creator.equals(userId))
    throw new Error('Only creator can see bookings');

  // Include completed bookings so finished passengers appear in the list
  const bookings = await Booking.find({
    ride: rideId,
    status: { $in: ['active', 'completed'] }
  }).populate('user', 'name email profileImage');

  return bookings;
};


export const updateBookingService = async (bookingId, userId, status, baggageType) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (!booking.user.equals(userId)) throw new Error('Unauthorized');

  if (status) {
    booking.status = status;
    if (status === 'cancelled') booking.leftAt = new Date();
  }

  if (baggageType) {
    booking.baggageType = baggageType;
  }

  return await booking.save();
};


export const getBookingByIdService = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId).populate('ride user');
  if (!booking) throw new Error('Booking not found');
  if (!booking.user._id.equals(userId))
    throw new Error('Unauthorized access to booking');

  const rideId = booking.ride._id.toString();

  // Attach full participant list (active + completed) for rating screen
  const participants = await Booking.find({
    ride: rideId,
    status: { $in: ['active', 'completed'] }
  })
    .populate('user', 'name profileImage')
    .lean();

  return {
    ...booking.toObject(),
    ride: {
      ...booking.ride.toObject(),
      participants: participants.map((p) => ({
        userId: p.user._id,
        name: p.user.name,
        profileImage: p.user.profileImage || '',
        seatBooked: p.seatBooked,
        status: p.status
      }))
    }
  };
};
