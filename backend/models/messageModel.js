// backend/models/messageModel.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Channel",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  date: { type: Date, required: true },
  username: { type: String, required: true },
  // optional image data
  imageUrl: { type: String, default: null },
  imagePublicId: { type: String, default: null },
});

const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
export default Message;
