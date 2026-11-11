import Message from "./message.model.js";
// import { io } from "../../app.js";

export const sendMessageService = async (resource,message) => {

    let newMessage = await Message.findOne({ resource });

    if (!newMessage) {
         newMessage = new Message({
            resource,
            messages: [message]
        });
        await newMessage.save();
        return newMessage;
    }
     else
     {
         const updateMessage = await Message.findByIdAndUpdate(
             newMessage._id,
             { $push: { messages: message } },
             { new: true, upsert: true }
         );
        
         // socket.io emit
    //    io.to(`room-${resource}`).emit("message", {
    //          message: message,
    //          sender: message.sender,
    //          resourceId: resource,
    //          createdAt: new Date(),
    //      });

        return updateMessage;
     }
};


export const getUserConversationsService = async () => {
    const messages = await Message.find({})
      .populate("resource", "title")
      .populate("messages.sender", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .lean();
  
    return messages;
}


export const getMessagesByResourceService = async (resourceId,userId) => {

    let messages = await Message.findOne({ resource: resourceId })
    .populate("messages.sender", "firstName lastName email role")

    let updated = false;
    messages.messages.forEach(msg => {
      if (!msg.read && msg.sender._id.toString() !== userId.toString()) {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) await messages.save();
  
    return {
        messages,
    };
};