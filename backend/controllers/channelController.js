import Channel from '../models/channelModel.js';

export const createChannel = async (req, res) => {
  try {
    const { name, serverId } = req.body;
    const { userId } = req.user;

    await Channel.create({
      name,
      serverId,
      createdBy: userId,
    });

    res.status(201).json({ message: "Channel created" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const editChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    await Channel.updateOne(
      { _id: id },
      {
        $set: { name },
      }
    );

    res.status(200).json({ message: "Channel updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { id } = req.params;
    await Channel.deleteOne({ _id: id });

    res.status(200).json({ message: "Channel Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchChannels = async (req, res) => {
  try {
    const { serverId } = req.params;
    const channels = await Channel.find({ serverId });

    res.status(200).json({ channels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const channel = await Channel.findById(id);

    res.status(200).json({ channel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
