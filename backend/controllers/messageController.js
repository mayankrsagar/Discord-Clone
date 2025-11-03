import Message from '../models/messageModel.js';

export const AddMessage = async (req, res) => {
  try {
    const { channelId, message, date } = req.body;
    const { username, userId } = req.user;

    await Message.create({
      channelId,
      message,
      date,
      username,
      userId,
    });

    res.status(201).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.status(200).json({ message: "Message Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId });
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, date } = req.body;
    await Message.findByIdAndUpdate(id, {
      $set: {
        message,
        date,
      },
    });
    res.status(200).json({ message: "Message Edited" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
