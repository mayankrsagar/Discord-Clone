import Channel from "../models/channelModel.js";
import Message from "../models/messageModel.js";
import Server from "../models/serverModel.js";
import { destroyImage, handleUpload } from "../utils/cloudinary.js";

/* POST /server */
export const createServer = async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user;
    const fileBuffer = req.file?.buffer || null;

    // Optional: check if server name already exists
    const existing = await Server.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Name already in use!" });
    }

    let imageUrl = "";
    let imagePublicId = "";

    if (fileBuffer) {
      try {
        const uploadRes = await handleUpload(fileBuffer, { folder: "servers" });
        imageUrl = uploadRes.secure_url || "";
        imagePublicId = uploadRes.public_id || "";
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const newServer = await Server.create({
      name,
      image: imageUrl,
      imagePublicId,
      owner: userId,
      members: [
        {
          userId,
          role: "owner",
        },
      ],
    });

    return res
      .status(201)
      .json({ message: "Server created", serverId: newServer._id });
  } catch (error) {
    console.error("createServer error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* GET /server/:id */
export const fetchServer = async (req, res) => {
  try {
    const { id } = req.params;
    const server = await Server.findById(id).lean();
    if (!server) return res.status(404).json({ message: "Server not found" });
    return res.status(200).json({ server });
  } catch (error) {
    console.error("fetchServer error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* PUT /server/:id */
export const updateServer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const fileBuffer = req.file?.buffer || null;

    const server = await Server.findById(id);
    if (!server) return res.status(404).json({ message: "Server not found" });

    if (server.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: "Only owner can edit" });

    let imageUrl = server.image;
    let imagePublicId = server.imagePublicId || "";

    if (fileBuffer) {
      // Upload new image
      let uploadRes;
      try {
        uploadRes = await handleUpload(fileBuffer, { folder: "servers" });
        imageUrl = uploadRes.secure_url || imageUrl;
        imagePublicId = uploadRes.public_id || imagePublicId;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }

      // After successful upload, attempt to delete previous image (best-effort)
      try {
        if (server.imagePublicId) {
          await destroyImage(server.imagePublicId);
        }
      } catch (destroyErr) {
        console.warn("Failed to delete previous Cloudinary image:", destroyErr);
      }
    }

    const updated = await Server.findByIdAndUpdate(
      id,
      { name: name || server.name, image: imageUrl, imagePublicId },
      { new: true }
    );

    res.status(200).json({ message: "Server updated", server: updated });
  } catch (err) {
    console.error("updateServer error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* DELETE /server/:id */
export const deleteServer = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id);
    if (!server) return res.status(404).json({ message: "Server not found" });

    // Optional: enforce only owner can delete
    if (server.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: "Only owner can delete server" });

    // delete cloudinary image (best-effort)
    try {
      if (server.imagePublicId) {
        await destroyImage(server.imagePublicId);
      }
    } catch (err) {
      console.warn("Failed to delete server image from Cloudinary:", err);
    }

    // delete channels & messages
    const channels = await Channel.find({ serverId: id });

    const messagePromises = channels.map((c) =>
      Message.deleteMany({ channelId: c._id })
    );
    const channelPromises = channels.map((c) =>
      Channel.findByIdAndDelete(c._id)
    );

    await Promise.all(messagePromises);
    await Promise.all(channelPromises);

    // delete server document
    await Server.findByIdAndDelete(id);

    res.status(200).json({ message: "Server deleted" });
  } catch (error) {
    console.error("deleteServer error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* GET /server (fetch servers for user) */
export const fetchServers = async (req, res) => {
  try {
    const { userId } = req.user;
    const servers = await Server.find().lean();

    const userServers = servers.filter((s) =>
      (s.members || []).some((m) => m.userId.toString() === userId.toString())
    );

    return res.status(200).json({ servers: userServers });
  } catch (error) {
    console.error("fetchServers error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* PUT /server/invite/:id */
export const createInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const { id } = req.params;

    await Server.findByIdAndUpdate(id, {
      $set: { inviteCode },
    });

    res.status(200).json({ message: "Invite code saved!" });
  } catch (error) {
    console.error("createInviteCode error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const matchInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?.userId;

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    const server = await Server.findOne({ inviteCode });
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    // Prevent duplicate membership
    const alreadyMember = server.members.some(
      (member) => member.userId.toString() === userId
    );
    if (alreadyMember) {
      return res
        .status(409)
        .json({ message: "Already a member of this server" });
    }

    // Add user to members
    server.members.push({ userId, role: "member" });
    await server.save();

    // Remove invite code (optional: only if it's single-use)
    server.inviteCode = undefined;
    await server.save();

    res.status(200).json({ server, message: "Joined server successfully" });
  } catch (error) {
    console.error("matchInviteCode error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* PUT /server/leave/:id  (or whichever route you use) */
export const leaveServer = async (req, res) => {
  try {
    const { id } = req.params; // server id
    const { userId } = req.user;

    const server = await Server.findById(id);
    if (!server) return res.status(404).json({ message: "Server not found" });

    // Remove member
    server.members = server.members.filter(
      (member) => member.userId.toString() !== userId.toString()
    );

    // If no members left, delete server entirely (including channels/messages and cloudinary image)
    if (!server.members || server.members.length === 0) {
      // delete cloudinary image (best-effort)
      try {
        if (server.imagePublicId) {
          await destroyImage(server.imagePublicId);
        }
      } catch (err) {
        console.warn("Failed to delete server image from Cloudinary:", err);
      }

      // delete channels & messages
      const channels = await Channel.find({ serverId: id });
      const messagePromises = channels.map((c) =>
        Message.deleteMany({ channelId: c._id })
      );
      const channelPromises = channels.map((c) =>
        Channel.findByIdAndDelete(c._id)
      );
      await Promise.all(messagePromises);
      await Promise.all(channelPromises);

      // delete server document
      await Server.findByIdAndDelete(id);

      return res.status(200).json({
        message: "You left and the server was deleted (no members left)",
      });
    }

    // Otherwise, save updated members list
    await server.save();

    return res.status(200).json({ message: "Left the server successfully" });
  } catch (error) {
    console.error("leaveServer error:", error);
    res.status(500).json({ message: error.message });
  }
};
