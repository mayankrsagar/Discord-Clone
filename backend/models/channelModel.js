// backend/models/channelModel.js
import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
  },
  // NEW: optional members array to track who is currently in the channel
  // This allows us to remove a user on "leave" and delete the channel if empty.
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Channel =
  mongoose.models.Channel || mongoose.model("Channel", channelSchema);

export default Channel;
