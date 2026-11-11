import cron from "node-cron";
import { io } from "../app.js";
import ChatRoom from "../entities/message/chatRoom.model.js";
import Message from "../entities/message/message.model.js";
import Ride from "../entities/ride/ride.model.js";

export const autoDeleteExpiredChatRooms = () => {
  cron.schedule("*/2 * * * *", async () => {
    const now = new Date();
    console.log(`[CRON] Running chat cleanup job at ${now.toISOString()}`);

    try {
      const expiredRides = await Ride.find({
        chatRoom: { $exists: true, $ne: null },
        departureTime: {
          $lte: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
      }).select("_id chatRoom departureTime");

      console.log(`[CRON] Found ${expiredRides.length} expired chats`);

      for (const ride of expiredRides) {
        try {
          const chatRoom = await ChatRoom.findById(ride.chatRoom);
          if (!chatRoom) continue;

          // Delete all messages
          await Message.deleteMany({ chatRoom: chatRoom._id });

          // Delete chat room
          await ChatRoom.deleteOne({ _id: chatRoom._id });

          // Remove reference from Ride
          await Ride.updateOne(
            { _id: ride._id },
            { $unset: { chatRoom: "" } }
          );

          // Emit socket event
          if (io?.to) {
            io.to(`room-${chatRoom._id}`).emit("chatRoomDeleted", {
              roomId: chatRoom._id,
              reason: "Chat expired (2 hours after departure)",
            });
          }

          console.log(`🗑 ChatRoom ${chatRoom._id} deleted (expired)`);

        } catch (err) {
          console.error(`❌ Failed to delete chat for ride ${ride._id}`, err.message);
        }
      }
    } catch (error) {
      console.error("❌ Chat cleanup cron failed:", error.message);
    }
  });
};