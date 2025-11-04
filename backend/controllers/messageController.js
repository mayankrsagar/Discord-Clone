// backend/controllers/messageController.js
import Message from '../models/messageModel.js';
import {
  destroyImage,
  handleUpload,
} from '../utils/cloudinary.js'; // import upload helper

export const AddMessage = async (req, res) => {
  try {
    const { channelId, message, date } = req.body;
    const { username, userId } = req.user;
    const fileBuffer = req.file?.buffer || null;

    let imageUrl = null;
    let imagePublicId = null;

    if (fileBuffer) {
      try {
        const uploadRes = await handleUpload(fileBuffer, {
          folder: "messages",
        });
        imageUrl = uploadRes.secure_url;
        imagePublicId = uploadRes.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const created = await Message.create({
      channelId,
      message,
      date,
      username,
      userId,
      imageUrl,
      imagePublicId,
    });

    // Emit the created message to the channel room so clients receive same payload (including _id).
    try {
      if (global.io && channelId) {
        global.io.to(channelId.toString()).emit("message", {
          _id: created._id,
          channelId: created.channelId,
          message: created.message,
          date: created.date,
          username: created.username,
          userId: created.userId,
          imageUrl: created.imageUrl,
          imagePublicId: created.imagePublicId,
        });
      }
    } catch (emitErr) {
      console.warn("Failed to emit message via socket:", emitErr);
    }

    // return created message for frontend (helpful for optimistic updates)
    res.status(201).json({ message: "Message created", data: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Message.findByIdAndDelete(id);

    // if removed had an image, delete from cloudinary
    if (removed?.imagePublicId) {
      try {
        await destroyImage(removed.imagePublicId);
      } catch (err) {
        console.warn("Failed to delete cloudinary image:", err);
      }
    }

    // emit deletion to channel (so clients can remove it)
    try {
      if (global.io && removed?.channelId) {
        global.io
          .to(removed.channelId.toString())
          .emit("messageDeleted", { _id: id });
      }
    } catch (emitErr) {
      console.warn("Failed to emit messageDeleted:", emitErr);
    }

    res.status(200).json({ message: "Message Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    // sort by date ascending (older first)
    const messages = await Message.find({ channelId }).sort({ date: 1 });
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, date } = req.body;
    const updated = await Message.findByIdAndUpdate(
      id,
      { $set: { message, date } },
      { new: true }
    );

    // emit edit to channel so other clients can update text
    try {
      if (global.io && updated?.channelId) {
        global.io.to(updated.channelId.toString()).emit("messageEdited", {
          _id: updated._id,
          message: updated.message,
          date: updated.date,
        });
      }
    } catch (emitErr) {
      console.warn("Failed to emit messageEdited:", emitErr);
    }

    res.status(200).json({ message: "Message Edited", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
