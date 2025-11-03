import Channel from "../models/channelModel.js";
import Message from "../models/messageModel.js";
import Server from "../models/serverModel.js"; // adjust the path as needed
import { handleUpload } from "../utils/cloudinary.js";

export const createServer = async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user;
    const image = req.file ? req.file.buffer : null;

    // Optional: check if server name already exists
    const server = await Server.findOne({ name });
    if (server) {
      return res.status(400).json({ message: "Name already in use!" });
    }

    let uploadImage = null;
    if (image) {
      try {
        uploadImage = await handleUpload(image);
      } catch (uploadError) {
        console.error("❌ Cloudinary upload failed:", uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } else {
      console.log("📭 No image provided, skipping upload");
    }

    const newServer = await Server.create({
      name,
      image: uploadImage?.secure_url || "",
      owner: userId,
      members: [
        {
          userId,
          role: "owner",
        },
      ],
    });

    console.log("✅ Server created:", newServer._id);
    return res
      .status(201)
      .json({ message: "Server created", serverId: newServer._id });
  } catch (error) {
    console.error("🔥 Server creation error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const fetchServer = async (req, res) => {
  try {
    const { id } = req.params;
    const server = await Server.findById(id);

    return res.status(200).json({ server });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// backend/controllers/serverController.js  (append)

export const updateServer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const image = req.file?.buffer || null;

    const server = await Server.findById(id);
    if (!server) return res.status(404).json({ message: "Server not found" });

    if (server.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: "Only owner can edit" });

    let imageUrl = server.image; // keep old one by default
    if (image) {
      const uploaded = await handleUpload(image);
      imageUrl = uploaded.secure_url;
    }

    const updated = await Server.findByIdAndUpdate(
      id,
      { name: name || server.name, image: imageUrl },
      { new: true }
    );

    res.status(200).json({ message: "Server updated", server: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteServer = async (req, res) => {
  try {
    const { id } = req.params;

    await Server.findByIdAndDelete(id);
    res.status(200).json({ message: "Server deleted" });

    const channels = await Channel.find({ serverId: id });

    const messagePromises = channels.map((c) =>
      Message.deleteMany({ channelId: c._id })
    );

    const channelPromises = channels.map((c) =>
      Channel.findByIdAndDelete(c._id)
    );

    await Promise.all(messagePromises);
    await Promise.all(channelPromises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchServers = async (req, res) => {
  try {
    const { userId } = req.user;
    const servers = await Server.find();

    const userServers = servers.filter((s) =>
      s.members.some((m) => m.userId.toString() === userId.toString())
    );

    return res.status(200).json({ servers: userServers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const { id } = req.params;

    await Server.findByIdAndUpdate(id, {
      $set: { inviteCode },
    });

    res.status(200).json({ message: "Invite code saved!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const leaveServer = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    server.members = server.members.filter(
      (member) => member.userId.toString() !== userId.toString()
    );

    await server.save();

    res.status(200).json({ message: "Left the server successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
