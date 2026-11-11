import mongoose from 'mongoose';
import Booking from '../booking/booking.model.js';
import Rating from '../rating/rating.model.js';
import Ride from './ride.model.js';
import ChatRoom from '../message/chatRoom.model.js';
import Message from '../message/message.model.js';
import { createNotificationService } from '../notification/notification.service.js';
import { io } from '../../app.js';
import User from '../auth/auth.model.js';


export const createRideService = async (
  userId,
  { startLocation, endLocation, departureTime, availableSeats, baggageType }
) => {
  const seatCount = 4;
  const available = Number(availableSeats) || 0;
  const selfBookedSeats = seatCount - available;

  if (selfBookedSeats < 1)
    throw new Error("You must keep at least one seat for yourself.");
  if (selfBookedSeats > seatCount)
    throw new Error("Invalid available seat count.");

  startLocation.location = {
    type: "Point",
    coordinates: [startLocation.lng, startLocation.lat],
  };
  endLocation.location = {
    type: "Point",
    coordinates: [endLocation.lng, endLocation.lat],
  };

  const ride = new Ride({
    creator: userId,
    startLocation,
    endLocation,
    departureTime,
    seatCount,
    bookedSeats: selfBookedSeats,
    baggageType,
    price: 0,
    chatLocked: true,
  });

  await ride.save();

  // Create chatroom immediately on ride creation — but locked
  const chatRoom = await ChatRoom.create({
    ride: ride._id,
    name: `Ride to ${endLocation.address}`,
    isGroup: true,
    participants: [userId], // only creator for now
    description: `Group chat for ride from ${startLocation.address} to ${endLocation.address}`,
  });

  ride.chatRoom = chatRoom._id;
  await ride.save();

  // Bookings for creator
  const bookingDocs = [];
  for (let i = 0; i < selfBookedSeats; i++) {
    bookingDocs.push({
      ride: ride._id,
      user: userId,
      seatBooked: 1,
      baggageType,
      status: "active",
      joinedAt: new Date(),
    });
  }
  await Booking.insertMany(bookingDocs);

  await createNotificationService({
    user: userId,
    type: "general",
    message: `Ride created successfully with ${available} available seat${available !== 1 ? "s" : ""}`,
    ride: ride._id,
  });

  const populatedRide = await Ride.findById(ride._id)
    .populate("creator", "_id name email phoneNumber profileImage");

  io.to(userId.toString()).emit("notification", {
    type: "general",
    message: "Ride created successfully",
    ride: populatedRide,
  });

  io.emit("ride_created", {
    ride: populatedRide,
    creator: userId,
  });

  return { ride: populatedRide };
};


export const seeRideService = async (rideId) => {
  const ride = await Ride.findById(rideId)
    .populate("creator", "_id name email profileImage")
    .populate({
      path: "chatRoom",
      populate: {
        path: "participants",
        select: "_id name email profileImage phoneNumber",
      },
    })
    .lean();

  if (!ride) throw new Error("Ride not found");

  // Fetch bookings (only active + completed)
  const bookings = await Booking.find({
    ride: rideId,
    status: { $in: ["active", "completed"] }
  })
    .populate("user", "name profileImage email")
    .lean();

  // Collect all userIds
  const participantIds = bookings.map((b) => b.user._id);

  // Ratings
  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: new mongoose.Types.ObjectId(rideId),
        ratedUser: { $in: participantIds },
      },
    },
    {
      $group: {
        _id: "$ratedUser",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r._id.toString()] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.count,
    };
  });

  // Participants (only active & completed)
  const participants = bookings.map((b) => ({
    seatBooked: b.seatBooked,
    baggageType: b.baggageType,
    avgRating: ratingMap[b.user._id.toString()]
      ? Number(ratingMap[b.user._id.toString()].avgRating)
      : 0,
    userId: b.user._id,
    name: b.user.name,
    profileImage: b.user.profileImage || "",
    status: b.status
  }));

  return {
    ...ride,
    participants,
    participantsCount: participants.length,
  };
};


// Utility to calculate Haversine distance (in meters)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// to find correct direction of the ride
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// angle difference between two bearings
function bearingDiff(b1, b2) {
  const diff = Math.abs(b1 - b2);
  return diff > 180 ? 360 - diff : diff;
}


export const filterRidesService = async (query) => {
  const {
    fromLat,
    fromLng,
    toLat,
    toLng,
    departureTime,
    departureFlexMinutes = 15,
    departureFlexKm = 0.2,
    arrivalFlexKm = 0.2,
    passengers = 1,
    page = 1,
    limit = 10
  } = query;

  const currentPage = parseInt(page);
  const pageSize = parseInt(limit);

  const pipeline = [];

  // CASE 1: Filter mode (with geo + time + seat filter)
  if (fromLat && fromLng && toLat && toLng && departureTime) {
    const parsedDeparture = new Date(departureTime);
    if (isNaN(parsedDeparture)) {
      throw new Error("Invalid departureTime format. Use ISO 8601");
    }

    const timeMin = new Date(parsedDeparture.getTime() - departureFlexMinutes * 60000);
    const timeMax = new Date(parsedDeparture.getTime() + departureFlexMinutes * 60000);
    const departureMaxDistance = parseFloat(departureFlexKm) * 1000;

    pipeline.push({
      $geoNear: {
        near: { type: "Point", coordinates: [parseFloat(fromLng), parseFloat(fromLat)] },
        distanceField: "startLocation.distance",
        maxDistance: departureMaxDistance,
        spherical: true,
        key: "startLocation.location",
        query: {
          status: "active",
          $expr: { $gte: [{ $subtract: ["$seatCount", "$bookedSeats"] }, parseInt(passengers)] },
          $and: [
            { departureTime: { $gte: new Date() } },
            { departureTime: { $gte: timeMin } },
            { departureTime: { $lte: timeMax } }
          ]
        }
      }
    });
  } else {
    // CASE 2: All rides (no geo filter, just active rides)
    pipeline.push({
      $match: {
        status: "active",
        departureTime: { $gte: new Date() }
      }
    });
  }

  // Common lookups
  pipeline.push(
    {
      $lookup: {
        from: "bookings",
        let: { rideId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$ride", "$$rideId"] }, status: { $in: ["active"] } } },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "user"
            }
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "ratings",
              let: { participantId: "$user._id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$ratedUser", "$$participantId"] } } },
                { $group: { _id: null, avgRating: { $avg: "$rating" } } }
              ],
              as: "ratingData"
            }
          },
          {
            $addFields: {
              avgRating: { $ifNull: [{ $arrayElemAt: ["$ratingData.avgRating", 0] }, 0] }
            }
          },
          {
            $project: {
              _id: 0,
              userId: "$user._id",
              name: "$user.name",
              profileImage: "$user.profileImage",
              baggageType: 1,
              seatBooked: 1,
              avgRating: 1
            }
          }
        ],
        as: "bookings"
      }
    },
    { $addFields: { participants: "$bookings", participantsCount: { $size: "$bookings" } } },
    { $project: { bookings: 0 } }
  );

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator"
      }
    },
    { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } }
  );

  pipeline.push(
    {
      $lookup: {
        from: "chatrooms",
        localField: "chatRoom",
        foreignField: "_id",
        as: "chatRoom"
      }
    },
    { $unwind: { path: "$chatRoom", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "chatRoom.participants",
        foreignField: "_id",
        as: "chatRoom.participants"
      }
    }
  );

  pipeline.push({
    $project: {
      startLocation: 1,
      endLocation: 1,
      departureTime: 1,
      seatCount: 1,
      bookedSeats: 1,
      participants: 1,
      participantsCount: 1,
      status: 1,
      creator: {
        _id: "$creator._id",
        name: "$creator.name",
        email: "$creator.email",
        profileImage: "$creator.profileImage"
      },
      chatRoom: {
        _id: "$chatRoom._id",
        name: "$chatRoom.name",
        participants: {
          _id: 1,
          name: 1,
          email: 1,
          profileImage: 1
        }
      }
    }
  });

  const rides = await Ride.aggregate(pipeline);

  let filtered = rides;
  if (fromLat && fromLng && toLat && toLng && departureTime) {
    const arrivalMaxDistance = parseFloat(arrivalFlexKm) * 1000;
    const userBearing = calculateBearing(fromLat, fromLng, toLat, toLng);

    filtered = rides.filter((ride) => {
      const end = ride.endLocation;
      const distance = haversineDistance(toLat, toLng, end.lat, end.lng);
      const rideBearing =
        ride.bearing ??
        calculateBearing(ride.startLocation.lat, ride.startLocation.lng, end.lat, end.lng);
      const directionOK = bearingDiff(userBearing, rideBearing) <= 45;
      return distance <= arrivalMaxDistance && directionOK;
    });
  }

  const sorted = filtered.sort((a, b) => a.departureTime - b.departureTime);
  const totalData = sorted.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    rides: paginated,
    pagination: {
      currentPage,
      totalPages,
      totalData,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    }
  };
};


const ALLOWED_UPDATE_FIELDS = [
  'departureTime',
  'seatCount',
  'baggageType',
  'price',
  'filters',
  'startLocation',
  'endLocation',
];

export const updateRideService = async (rideId, userId, updates) => {
  const safeUpdates = Object.keys(updates)
    .filter((key) => ALLOWED_UPDATE_FIELDS.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  if (Object.keys(safeUpdates).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, creator: userId, status: 'active' },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  );

  if (!ride) throw new Error('Ride not found or not authorized to update');
  return ride;
};


export const softDeleteRideService = async (rideId, userId) => {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, creator: userId, status: 'active' },
    { deletedByCreator: true, status: 'cancelled' },
    { new: true }
  );
  if (!ride) throw new Error('Ride not found or not authorized to delete');
  return ride;
};


export const joinRideService = async (
  rideId,
  userId,
  { seatBooked = 1, baggageType }
) => {
  const ride = await Ride.findById(rideId).populate("chatRoom");

  if (!ride) throw new Error("Ride is not found!");
  if (ride.departureTime < new Date())
    throw new Error("Sorry, ride departure time has passed!");
  if (ride.bookedSeats + seatBooked > ride.seatCount)
    throw new Error("Not enough seats available");

  const isCreator = ride.creator.toString() === userId.toString();

  const bookings = [];
  for (let i = 0; i < seatBooked; i++) {
    const booking = await Booking.create({
      ride: rideId,
      user: userId,
      seatBooked: 1,
      baggageType,
      status: "active",
      joinedAt: new Date(),
    });
    bookings.push(booking);
  }

  ride.bookedSeats += seatBooked;
  await ride.save();

  const joinedUser = await User.findById(userId)
    .select("name profileImage")
    .lean();

  const chatRoom = await ChatRoom.findById(ride.chatRoom);

  if (chatRoom) {
    const alreadyParticipant = chatRoom.participants.some(
      (id) => id.toString() === userId.toString()
    );

    if (!alreadyParticipant) {
      chatRoom.participants.push(userId);
      await chatRoom.save();

      await Message.create({
        chatRoom: chatRoom._id,
        sender: userId,
        message: `${joinedUser.name} joined the ride (${seatBooked} seat${seatBooked > 1 ? "s" : ""})`,
        type: "system",
      });

      io.to(`room-${chatRoom._id}`).emit("userJoined", {
        userId,
        name: joinedUser.name,
      });
    }

    if (!isCreator && ride.chatLocked) {
      ride.chatLocked = false;
      await ride.save();

      io.to(`room-${chatRoom._id}`).emit("chat_unlocked", {
        rideId: ride._id,
        chatRoomId: chatRoom._id,
      });
    }
  }

  if (!isCreator) {
    await createNotificationService({
      user: ride.creator,
      type: "join",
      ride: rideId,
      message: `${joinedUser.name} joined the ride`,
    });
  }

  io.emit("ride_joined", {
    ride: rideId,
    user: userId,
    seatBooked,
  });

  return { success: true };
};


export const leaveRideService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).populate("chatRoom");
  if (!ride) throw new Error("Ride is not found!");
  if (ride.departureTime < new Date()) throw new Error("Sorry, ride departure time has passed! Cannot process leave-request.");

  const booking = await Booking.findOneAndUpdate(
    { ride: rideId, user: userId, status: "active" },
    { status: "cancelled", leftAt: new Date() },
    { new: true }
  );
  if (!booking) throw new Error("Booking not found");

  const leavingUser = await User.findById(userId).select("name profileImage").lean();

  // --- CASE 1: Last passenger leaves ---
  if (ride.bookedSeats === booking.seatBooked) {
    if (ride.chatRoom) {
      await Message.deleteMany({ chatRoom: ride.chatRoom });
      await ChatRoom.deleteOne({ _id: ride.chatRoom });

      io.to(`room-${ride.chatRoom._id}`).emit("chatRoomDeleted", {
        roomId: ride.chatRoom._id
      });
    }

    await Booking.deleteMany({ ride: rideId });
    await Ride.deleteOne({ _id: rideId });

    io.emit("ride_deleted", { rideId });

    return;
  }

  // --- CASE 2: Normal leave ---
  ride.bookedSeats -= booking.seatBooked;

  if (ride.creator.equals(userId) && ride.bookedSeats > 0) {
    const newCreatorBooking = await Booking.findOne(
      { ride: rideId, status: "active" },
      null,
      { sort: { joinedAt: 1 } }
    );
    if (newCreatorBooking) {
      ride.creator = newCreatorBooking.user;
    }
  }

  await ride.save();

  if (ride.chatRoom) {
    const chatRoom = await ChatRoom.findById(ride.chatRoom);
    if (chatRoom) {
      const activeBookingsForUser = await Booking.countDocuments({
        ride: rideId,
        user: userId,
        status: "active"
      });

      if (activeBookingsForUser === 0) {
        chatRoom.participants = chatRoom.participants.filter(
          id => id.toString() !== userId.toString()
        );
        await chatRoom.save();

        const systemMessage = await Message.create({
          chatRoom: chatRoom._id,
          sender: userId,
          message: `${leavingUser.name} left the ride`,
          type: "system"
        });

        io.to(`room-${chatRoom._id}`).emit("userLeft", {
          participants: [
            {
              userId,
              name: leavingUser.name,
              profileImage: leavingUser.profileImage || "",
              seatBooked: booking.seatBooked,
              leftAt: booking.leftAt
            }
          ]
        });

        io.to(`room-${chatRoom._id}`).emit("newMessage", {
          type: "system",
          text: `${leavingUser.name} left the ride`,
          createdAt: systemMessage.createdAt
        });
      }

      if (ride.bookedSeats < 2) {
        await Message.deleteMany({ chatRoom: chatRoom._id });
        await ChatRoom.deleteOne({ _id: chatRoom._id });

        io.to(`room-${chatRoom._id}`).emit("chatRoomDeleted", {
          roomId: chatRoom._id
        });
      }
    }
  }

  await createNotificationService({
    user: userId,
    type: "leave",
    ride: rideId,
    message: "You left the ride"
  });

  if (!ride.creator.equals(userId)) {
    await createNotificationService({
      user: ride.creator,
      type: "leave",
      ride: rideId,
      message: `${leavingUser.name} left the ride`
    });
  }

  io.emit("ride_left", { ride: rideId, user: userId });

  return {
    success: true,
    message: `${leavingUser.name} left the ride`,
    ride: {
      _id: ride._id,
      creator: ride.creator,
      bookedSeats: ride.bookedSeats,
      status: ride.status,
      chatRoom: ride.chatRoom ? ride.chatRoom._id : null
    },
    user: {
      _id: userId,
      name: leavingUser.name,
      profileImage: leavingUser.profileImage || ""
    }
  };
};


export const finishRideService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).populate("chatRoom");
  if (!ride) throw new Error("Ride is not found!");
  if (ride.status === "completed") throw new Error("Ride is already completed!");

  const bookingResult = await Booking.updateMany(
    { ride: rideId, user: userId, status: "active" },
    { status: "completed", leftAt: new Date() }
  );
  if (bookingResult.matchedCount === 0)
    throw new Error("Active booking not found for this user");

  const completedBookings = await Booking.find({
    ride: rideId,
    user: userId,
    status: "completed",
    leftAt: { $exists: true }
  })
    .sort({ leftAt: -1 })
    .limit(bookingResult.modifiedCount);

  const totalSeatsFreed = completedBookings.reduce(
    (sum, b) => sum + b.seatBooked,
    0
  );

  const originalCount = ride.bookedSeats;
  ride.bookedSeats = Math.max(ride.bookedSeats - totalSeatsFreed, 0);
  await ride.save();

  let chatRoomDeleted = false;
  if (ride.chatRoom) {
    const chatRoom = await ChatRoom.findById(ride.chatRoom._id);
    if (chatRoom) {
      chatRoom.participants = chatRoom.participants.filter(
        (id) => id.toString() !== userId.toString()
      );
      await chatRoom.save();

      const activeCount = chatRoom.participants.length;

      if (
        activeCount < Math.ceil(originalCount * 0.5) ||
        activeCount <= 1
      ) {
        await Message.deleteMany({ chatRoom: chatRoom._id });
        await ChatRoom.deleteOne({ _id: chatRoom._id });
        chatRoomDeleted = true;

        io.to(`room-${chatRoom._id}`).emit("chatRoomDeleted", {
          roomId: chatRoom._id
        });
      } else {
        await Message.create({
          chatRoom: chatRoom._id,
          sender: userId,
          message: `A participant has finished their ride.`,
          type: "system"
        });

        io.to(`room-${chatRoom._id}`).emit("userFinishedRide", {
          roomId: chatRoom._id,
          userId,
          rideId
        });
      }
    }
  }

  const remainingActiveBookings = await Booking.countDocuments({
    ride: rideId,
    status: "active"
  });
  if (remainingActiveBookings === 0) {
    ride.status = "completed";
    await ride.save();
  }

  await createNotificationService({
    user: userId,
    type: "finish",
    ride: ride._id,
    message: "You finished the ride. Please rate your companions."
  });

  return { ride, bookingResult, chatRoomDeleted };
};


export const transferOwnershipService = async (rideId, currentUserId) => {
  const ride = await Ride.findById(rideId);
  if (!ride || !ride.creator.equals(currentUserId))
    throw new Error('Unauthorized');

  const firstBooking = await Booking.findOne(
    { ride: rideId, status: 'active' },
    null,
    { sort: { joinedAt: 1 } }
  );
  if (!firstBooking) throw new Error('No eligible user to transfer to');

  ride.newCreator = firstBooking.user;
  await ride.save();
  return ride;
};


/**
 * voteKickUserService
 *
 * Core kick-vote logic:
 *
 * 1. Voter must be an active participant (and not the target).
 * 2. Target must be an active participant and must NOT be the ride creator.
 * 3. Vote weight = voter's total active seat count on this ride.
 *    Threshold = ceil(totalActiveBookedSeats * 0.5)
 *    — "totalActiveBookedSeats" = sum of seatBooked across ALL active bookings
 *      EXCLUDING the target's own seats (you can't vote with the target's seats).
 *
 *    Example A — 4 seats, 4 different users (1 seat each):
 *      totalActiveBookedSeats = 4, target's seats = 1
 *      votable seats = 3, threshold = ceil(4 * 0.5) = 2
 *      → 2 voters needed to kick
 *
 *    Example B — 4 seats, 3 users (User A=2 seats, B=1, C=1), kicking C:
 *      totalActiveBookedSeats = 4, threshold = ceil(4 * 0.5) = 2
 *      User A votes → their vote weight = 2 seats → accumulated = 2 >= 2 → KICK
 *      → A single vote from User A immediately kicks C
 *
 *    Example C — 4 seats, 3 users (User A=2 seats, B=1, C=1), kicking A:
 *      threshold = ceil(4 * 0.5) = 2
 *      B votes (weight 1) → accumulated = 1 < 2 → not yet
 *      C votes (weight 1) → accumulated = 2 >= 2 → KICK
 *
 * 4. A user can only vote once per target per ride (but their weight = their seats).
 * 5. When threshold is reached:
 *    - ALL active bookings for the target are cancelled (handles multi-seat).
 *    - Target is removed from the chat room.
 *    - Target receives a "you were kicked" notification + socket event.
 *    - All remaining participants receive a notification.
 *    - The kickedVotes entry for the target is cleaned up from the ride.
 */
export const voteKickUserService = async (rideId, voterId, targetUserId) => {
  const voterIdStr = voterId.toString();
  const targetIdStr = targetUserId.toString();

  if (voterIdStr === targetIdStr) {
    throw new Error('You cannot vote to kick yourself');
  }

  const ride = await Ride.findById(rideId).populate('chatRoom');
  if (!ride) throw new Error('Ride not found');
  if (ride.status !== 'active') throw new Error('Ride is not active');

  // --- 1. Verify voter is an active participant and get their seat count ---
  const voterBookings = await Booking.find({
    ride: rideId,
    user: voterId,
    status: 'active'
  });
  if (!voterBookings.length) {
    throw new Error('You are not an active participant in this ride');
  }
  // Voter's vote weight = total seats they hold
  const voterSeatCount = voterBookings.reduce((sum, b) => sum + b.seatBooked, 0);

  // --- 2. Verify target is an active participant ---
  const targetBookings = await Booking.find({
    ride: rideId,
    user: targetUserId,
    status: 'active'
  });
  if (!targetBookings.length) {
    throw new Error('Target user is not an active participant in this ride');
  }

  // --- 3. Prevent kicking the ride creator ---
  if (ride.creator.toString() === targetIdStr) {
    throw new Error('Cannot kick the ride creator');
  }

  // --- 4. Compute threshold based on total active booked seats ---
  // threshold = ceil(totalBookedSeats * 0.5)
  // This means a user holding 2/4 seats already has >= 50% vote power alone.
  const totalActiveBookedSeats = ride.bookedSeats; // already maintained by booking hooks
  const requiredVoteWeight = Math.ceil(totalActiveBookedSeats * 0.5);

  // --- 5. Register the vote (idempotent — one vote per voter per target) ---
  let voteRecord = ride.kickedVotes.find(
    (k) => k.targetUser.toString() === targetIdStr
  );

  let voteAdded = false;

  if (voteRecord) {
    const alreadyVoted = voteRecord.votedBy.some(
      (id) => id.toString() === voterIdStr
    );
    if (!alreadyVoted) {
      voteRecord.votedBy.push(voterId);
      voteAdded = true;
    }
  } else {
    ride.kickedVotes.push({ targetUser: targetUserId, votedBy: [voterId] });
    voteAdded = true;
    voteRecord = ride.kickedVotes[ride.kickedVotes.length - 1];
  }

  await ride.save();

  // Reload from DB to get accurate saved state
  const savedRide = await Ride.findById(rideId);
  const savedVoteRecord = savedRide.kickedVotes.find(
    (k) => k.targetUser.toString() === targetIdStr
  );

  // --- 6. Calculate accumulated vote weight from all voters ---
  // For each user who voted, sum their active seat count = their vote weight
  let accumulatedVoteWeight = 0;
  if (savedVoteRecord && savedVoteRecord.votedBy.length > 0) {
    const voterSeatCounts = await Booking.aggregate([
      {
        $match: {
          ride: new mongoose.Types.ObjectId(rideId),
          status: 'active',
          user: { $in: savedVoteRecord.votedBy }
        }
      },
      {
        $group: {
          _id: '$user',
          totalSeats: { $sum: '$seatBooked' }
        }
      }
    ]);
    accumulatedVoteWeight = voterSeatCounts.reduce((sum, v) => sum + v.totalSeats, 0);
  }

  const currentVoterCount = savedVoteRecord ? savedVoteRecord.votedBy.length : 0;

  // --- 7. Notify about the new vote (only if vote was actually added) ---
  if (voteAdded) {
    await createNotificationService({
      user: targetUserId,
      type: 'kick',
      ride: rideId,
      message: `A participant voted to kick you (${accumulatedVoteWeight}/${requiredVoteWeight} vote weight)`
    });

    const otherUserIds = await Booking.distinct('user', {
      ride: rideId,
      status: 'active',
      user: { $nin: [voterId, targetUserId] }
    });

    for (const uid of otherUserIds) {
      await createNotificationService({
        user: uid,
        type: 'kick',
        ride: rideId,
        message: `A kick vote was cast in your ride (${accumulatedVoteWeight}/${requiredVoteWeight} vote weight)`
      });
    }

    io.to(`room-${ride.chatRoom?._id}`).emit('kick_vote_update', {
      rideId,
      targetUserId: targetIdStr,
      accumulatedVoteWeight,
      requiredVoteWeight,
      totalActiveBookedSeats,
      voterCount: currentVoterCount
    });
  }

  // --- 8. Check if kick threshold is reached ---
  if (accumulatedVoteWeight >= requiredVoteWeight) {
    // Cancel ALL active bookings for the target (handles multi-seat bookings)
    const targetBookings = await Booking.find({
      ride: rideId,
      user: targetUserId,
      status: 'active'
    });

    const totalSeatsFreed = targetBookings.reduce((sum, b) => sum + b.seatBooked, 0);

    await Booking.updateMany(
      { ride: rideId, user: targetUserId, status: 'active' },
      {
        status: 'cancelled',
        leftAt: new Date(),
        kicked: true,
        cancelReason: 'Kicked by majority vote'
      }
    );

    // Update ride's booked seat count
    const updatedRide = await Ride.findById(rideId).populate('chatRoom');
    updatedRide.bookedSeats = Math.max(updatedRide.bookedSeats - totalSeatsFreed, 0);

    // Clean up the vote record for the kicked user
    updatedRide.kickedVotes = updatedRide.kickedVotes.filter(
      (k) => k.targetUser.toString() !== targetIdStr
    );

    await updatedRide.save();

    // Remove target from chat room
    if (updatedRide.chatRoom) {
      const chatRoom = await ChatRoom.findById(updatedRide.chatRoom._id ?? updatedRide.chatRoom);
      if (chatRoom) {
        chatRoom.participants = chatRoom.participants.filter(
          (id) => id.toString() !== targetIdStr
        );
        await chatRoom.save();

        const targetUser = await User.findById(targetUserId).select('name').lean();

        // System message in chat room
        await Message.create({
          chatRoom: chatRoom._id,
          message: `${targetUser?.name ?? 'A user'} was removed from the ride by majority vote`,
          type: 'system'
        });

        // Emit to everyone in the chat room that the user was kicked
        io.to(`room-${chatRoom._id}`).emit('userKicked', {
          roomId: chatRoom._id,
          userId: targetIdStr,
          rideId,
          totalSeatsFreed
        });
      }
    }

    // Notify kicked user
    await createNotificationService({
      user: targetUserId,
      type: 'kick',
      ride: rideId,
      message: 'You have been removed from the ride by majority vote'
    });

    // Notify remaining active participants
    const remainingBookings = await Booking.find({
      ride: rideId,
      status: 'active'
    }).distinct('user');

    for (const userId of remainingBookings) {
      await createNotificationService({
        user: userId,
        type: 'kick',
        ride: rideId,
        message: 'A participant was removed from the ride by majority vote'
      });
    }

    // Global socket event
    io.emit('user_kicked', {
      ride: rideId,
      user: targetIdStr,
      reason: 'Majority vote',
      totalSeatsFreed
    });

    return {
      message: 'User has been kicked from the ride',
      data: {
        kicked: true,
        targetUserId: targetIdStr,
        totalSeatsFreed,
        accumulatedVoteWeight,
        requiredVoteWeight,
        totalActiveBookedSeats,
        voterCount: currentVoterCount
      }
    };
  }

  // Threshold not yet reached — vote was registered, waiting for more
  return {
    message: voteAdded
      ? `Kick vote registered (${accumulatedVoteWeight}/${requiredVoteWeight} vote weight)`
      : 'You have already voted to kick this user',
    data: {
      kicked: false,
      targetUserId: targetIdStr,
      accumulatedVoteWeight,
      requiredVoteWeight,
      totalActiveBookedSeats,
      voterCount: currentVoterCount,
      voterSeatCount,
      alreadyVoted: !voteAdded
    }
  };
};


/**
 * getKickVoteStatusService
 *
 * Returns current kick vote status for a given target user in a ride.
 *
 * Response includes:
 *  - voterCount           : how many distinct users have voted
 *  - accumulatedVoteWeight: sum of seats held by all voters
 *  - requiredVoteWeight   : threshold to kick (ceil(totalBookedSeats * 0.5))
 *  - totalActiveBookedSeats: total active seats on the ride
 *  - votedBy              : array of user IDs who voted
 *  - eligible             : true if threshold is already reached
 *  - targetIsActive       : whether the target still has an active booking
 */
export const getKickVoteStatusService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).lean();
  if (!ride) throw new Error('Ride not found');

  // Threshold based on total active booked seats
  const totalActiveBookedSeats = ride.bookedSeats;
  const requiredVoteWeight = Math.ceil(totalActiveBookedSeats * 0.5);

  // Check if target is still active
  const targetActiveBooking = await Booking.findOne({
    ride: rideId,
    user: userId,
    status: 'active'
  }).lean();

  const vote = ride.kickedVotes.find((k) => k.targetUser.toString() === userId);

  if (!vote) {
    return {
      voterCount: 0,
      accumulatedVoteWeight: 0,
      requiredVoteWeight,
      totalActiveBookedSeats,
      votedBy: [],
      eligible: false,
      targetIsActive: !!targetActiveBooking
    };
  }

  // Calculate accumulated vote weight from all voters
  let accumulatedVoteWeight = 0;
  if (vote.votedBy.length > 0) {
    const voterSeatCounts = await Booking.aggregate([
      {
        $match: {
          ride: new mongoose.Types.ObjectId(rideId),
          status: 'active',
          user: { $in: vote.votedBy }
        }
      },
      {
        $group: {
          _id: '$user',
          totalSeats: { $sum: '$seatBooked' }
        }
      }
    ]);
    accumulatedVoteWeight = voterSeatCounts.reduce((sum, v) => sum + v.totalSeats, 0);
  }

  const eligible = accumulatedVoteWeight >= requiredVoteWeight;

  return {
    voterCount: vote.votedBy.length,
    accumulatedVoteWeight,
    requiredVoteWeight,
    totalActiveBookedSeats,
    votedBy: vote.votedBy,
    eligible,
    targetIsActive: !!targetActiveBooking
  };
};


export const getRideParticipantsService = async (rideId) => {
  const bookings = await Booking.find({ ride: rideId, status: 'active' })
    .populate('user', 'name email avatar')
    .lean();

  const participantIds = bookings.map((b) => b.user._id);

  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: new mongoose.Types.ObjectId(rideId),
        ratedUser: { $in: participantIds }
      }
    },
    {
      $group: {
        _id: '$ratedUser',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r._id.toString()] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.count
    };
  });

  return bookings.map((b) => ({
    user: {
      ...b.user,
      avgRating: ratingMap[b.user._id.toString()]?.avgRating || null,
      ratingCount: ratingMap[b.user._id.toString()]?.ratingCount || 0
    },
    seatBooked: b.seatBooked,
    baggageType: b.baggageType,
    joinedAt: b.joinedAt
  }));
};


export const setMeetPointService = async (rideId, userId, meetPoint) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error('Ride not found');
  if (!ride.creator.equals(userId))
    throw new Error('Only creator can set meet point');

  ride.meetPoint = meetPoint;
  await ride.save();

  return ride;
};


export const rateRideParticipantsService = async (rideId, raterId, ratings) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const raterBooking = await Booking.findOne({
      ride: rideId,
      user: raterId,
      status: 'completed'
    }).session(session);

    if (!raterBooking) throw new Error('You can only rate after you have completed the ride');

    if (!Array.isArray(ratings) || ratings.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return { success: true, ratedCount: 0 };
    }

    const bulkRatings = [];

    for (const { userId, score } of ratings) {
      if (String(userId) === String(raterId)) {
        throw new Error("You can't rate yourself");
      }

      const targetBooking = await Booking.findOne({
        ride: rideId,
        user: userId
      }).session(session);
      if (!targetBooking) continue;

      const exists = await Rating.findOne({
        ride: rideId,
        rater: raterId,
        ratedUser: userId
      }).session(session);
      if (exists) continue;

      bulkRatings.push({
        ride: rideId,
        rater: raterId,
        ratedUser: userId,
        rating: score
      });
    }

    if (bulkRatings.length > 0) {
      await Rating.insertMany(bulkRatings, { session });

      for (const r of bulkRatings) {
        io.emit('got_rated', {
          ride: r.ride,
          ratedUser: r.ratedUser,
          rater: r.rater,
          rating: r.rating
        });

        await createNotificationService({
          user: r.ratedUser,
          type: 'rating',
          ride: r.ride,
          message: `You received a ${r.rating}-star rating from a companion`
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { success: true, ratedCount: bulkRatings.length };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};