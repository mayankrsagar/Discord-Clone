// backend/controllers/channelController.js
import Channel from '../models/channelModel.js';

/**
 * Create a channel and optionally add the creator to members
 */
export const createChannel = async (req, res) => {
  try {
    const { name, serverId } = req.body;
    const { userId } = req.user;

    const created = await Channel.create({
      name,
      serverId,
      createdBy: userId,
      members: [userId], // add creator by default
    });

    res.status(201).json({ message: "Channel created", data: created });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Edit channel - only creator can edit
 */
export const editChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { userId } = req.user;

    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (String(channel.createdBy) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this channel" });
    }

    channel.name = name ?? channel.name;
    await channel.save();

    // Emit channelUpdated to its room so other clients can refresh metadata
    try {
      if (global.io && channel._id) {
        global.io.to(channel._id.toString()).emit("channelUpdated", {
          _id: channel._id,
          name: channel.name,
          members: channel.members ?? [],
        });
      }
    } catch (emitErr) {
      console.warn("Failed to emit channelUpdated:", emitErr);
    }

    res.status(200).json({ message: "Channel updated", data: channel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete channel - only creator can delete
 */
export const deleteChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (String(channel.createdBy) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this channel" });
    }

    // delete
    await Channel.deleteOne({ _id: id });

    // Emit channelDeleted to the channel room and also to server room (optional)
    try {
      if (global.io) {
        // Emit to the channel room
        global.io.to(id.toString()).emit("channelDeleted", { _id: id });

        // Optionally emit to server room if you use server rooms (serverId)
        if (channel.serverId) {
          global.io
            .to(channel.serverId.toString())
            .emit("channelDeleted", { _id: id });
        }
      }
    } catch (emitErr) {
      console.warn("Failed to emit channelDeleted:", emitErr);
    }

    res.status(200).json({ message: "Channel Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch channels by serverId
 */
export const fetchChannels = async (req, res) => {
  try {
    const { serverId } = req.params;
    const channels = await Channel.find({ serverId });

    res.status(200).json({ channels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch single channel
 */
export const fetchChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const channel = await Channel.findById(id);

    res.status(200).json({ channel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Leave channel: remove the user from members.
 * If the members array becomes empty after removal, delete the channel.
 *
 * Emits:
 * - "channelDeleted" if channel deleted
 * - "channelUpdated" with updated members if channel still present
 */
export const leaveChannel = async (req, res) => {
  try {
    const { id } = req.params; // channel id
    const { userId } = req.user;

    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Remove user from members (if present)
    channel.members = (channel.members || []).filter(
      (m) => String(m) !== String(userId)
    );

    // If no members left, delete channel and emit deletion
    if (!channel.members || channel.members.length === 0) {
      await Channel.deleteOne({ _id: id });

      try {
        if (global.io) {
          global.io.to(id.toString()).emit("channelDeleted", { _id: id });
          if (channel.serverId) {
            global.io.to(channel.serverId.toString()).emit("channelDeleted", {
              _id: id,
            });
          }
        }
      } catch (emitErr) {
        console.warn("Failed to emit channelDeleted:", emitErr);
      }

      return res.status(200).json({
        message:
          "You left the channel. Channel had no members and was deleted.",
        channelDeleted: true,
      });
    }

    // Otherwise save updated members and emit updated members list
    await channel.save();

    try {
      if (global.io) {
        global.io.to(channel._id.toString()).emit("channelUpdated", {
          _id: channel._id,
          members: channel.members,
        });

        if (channel.serverId) {
          // optionally notify server room about channel membership change
          global.io.to(channel.serverId.toString()).emit("channelUpdated", {
            _id: channel._id,
            members: channel.members,
          });
        }
      }
    } catch (emitErr) {
      console.warn("Failed to emit channelUpdated:", emitErr);
    }

    res.status(200).json({
      message: "You left the channel.",
      channelDeleted: false,
      channel,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
