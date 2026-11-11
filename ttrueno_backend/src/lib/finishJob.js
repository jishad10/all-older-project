import cron from "node-cron";
import Booking from "../entities/booking/booking.model.js";
import ChatRoom from "../entities/message/chatRoom.model.js";
import Ride from "../entities/ride/ride.model.js";
import Message from "../entities/message/message.model.js";
import { io } from "../app.js";
import { createNotificationService } from "../entities/notification/notification.service.js";


export const finishJOb = () => {
  cron.schedule("*/10 * * * *", async () => {
    const now = new Date();
    console.log(`[CRON] Running ride auto-completion job at ${now.toISOString()}`);
 
    const rides = await Ride.find({
      status: { $ne: "completed" },
      departureTime: { $lte: new Date(now.getTime() - 2 * 60 * 60 * 1000) }
    });
 
    console.log(`[CRON] Found ${rides.length} rides to process`);
 
    for (const ride of rides) {
      try {
        const activeBookings = await Booking.find({ ride: ride._id, status: "active" });
        if (!activeBookings.length) continue;
 
        const originalCount = ride.bookedSeats;
 
        for (const booking of activeBookings) {
          // 1. Mark booking completed
          await Booking.updateOne(
            { _id: booking._id, status: "active" },
            { $set: { status: "completed", leftAt: new Date() } }
          );
 
          // 2. Chat room handling
          if (ride.chatRoom) {
            const chatRoom = await ChatRoom.findById(ride.chatRoom);
            if (chatRoom) {
              chatRoom.participants = chatRoom.participants.filter(
                id => id.toString() !== booking.user.toString()
              );
              await chatRoom.save();
 
              const activeCount = chatRoom.participants.length;
 
              if (activeCount < Math.ceil(originalCount * 0.5) || activeCount <= 1) {
                await Message.deleteMany({ chatRoom: chatRoom._id });
                await ChatRoom.deleteOne({ _id: chatRoom._id });
 
                if (io?.to) {
                  io.to(`room-${chatRoom._id}`).emit("chatRoomDeleted", {
                    roomId: chatRoom._id,
                    reason: "Ride auto-completed"
                  });
                }
              } else {
                await Message.create({
                  chatRoom: chatRoom._id,
                  sender: null,
                  message: `A participant's ride was automatically completed.`,
                  type: "system"
                });
 
                if (io?.to) {
                  io.to(`room-${chatRoom._id}`).emit("userFinishedRide", {
                    roomId: chatRoom._id,
                    userId: booking.user,
                    rideId: ride._id
                  });
                }
              }
            }
          }
 
          // 3. Send notification
          await createNotificationService({
            user: booking.user,
            type: "finish",
            ride: ride._id,
            message: "Your ride was auto-completed. Please rate your companions."
          });
        }
 
        // 4. Recalculate bookedSeats from DB after all bookings are completed
        const activeSeats = await Booking.aggregate([
          { $match: { ride: ride._id, status: "active" } },
          { $group: { _id: null, total: { $sum: "$seatBooked" } } }
        ]);
        await Ride.updateOne(
          { _id: ride._id },
          { $set: { bookedSeats: activeSeats[0]?.total || 0 } }
        );
 
        // 5. Finalize ride if all bookings are done
        const remainingActive = await Booking.countDocuments({
          ride: ride._id,
          status: "active"
        });
 
        if (remainingActive === 0) {
          await Ride.updateOne(
            { _id: ride._id, status: { $ne: "completed" } },
            { $set: { status: "completed" } }
          );
          console.log(`✅ Ride ${ride._id} auto-completed (all users finished)`);
        }
      } catch (err) {
        console.error(`❌ Ride ${ride._id} auto-completion failed:`, err.message);
      }
    }
  });
};