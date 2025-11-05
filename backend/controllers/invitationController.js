import Invitation from '../models/invitationModel.js';
import Server from '../models/serverModel.js';

export const addInvitation = async (req, res) => {
  try {
    const { receiverUserId, serverId } = req.body;
    const inviterUserId = req.user?.userId;

    if (!inviterUserId)
      return res.status(401).json({ message: "Unauthorized" });
    if (!receiverUserId || !serverId)
      return res.status(400).json({ message: "Missing fields" });
    if (String(inviterUserId) === String(receiverUserId)) {
      return res.status(400).json({ message: "You cannot invite yourself" });
    }

    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    // check if receiver is already a member
    const isMember = (server.members || []).some(
      (m) => String(m.userId) === String(receiverUserId)
    );
    if (isMember)
      return res
        .status(400)
        .json({ message: "User is already a member of the server" });

    // check if invitation already exists
    const existing = await Invitation.findOne({ receiverUserId, serverId });
    if (existing)
      return res.status(409).json({ message: "Invitation already exists" });

    const created = await Invitation.create({
      receiverUserId,
      inviterUserId,
      serverId,
      date: new Date(),
    });

    return res.status(201).json({ message: "Invitation sent", data: created });
  } catch (error) {
    console.error("addInvitation error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const cancelInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user?.userId;
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const invitation = await Invitation.findById(id);
    if (!invitation)
      return res.status(404).json({ message: "Invitation not found" });

    // only inviter or receiver can cancel
    if (
      String(invitation.inviterUserId) !== String(requester) &&
      String(invitation.receiverUserId) !== String(requester)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Invitation.findByIdAndDelete(id);
    return res.status(200).json({ message: "Invitation cancelled" });
  } catch (error) {
    console.error("cancelInvitation error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const receiverUserId = req.user?.userId;
    if (!receiverUserId)
      return res.status(401).json({ message: "Unauthorized" });

    const invitation = await Invitation.findById(id);
    if (!invitation)
      return res.status(404).json({ message: "Invitation not found" });

    if (String(invitation.receiverUserId) !== String(receiverUserId)) {
      return res
        .status(403)
        .json({ message: "You are not the receiver of this invitation" });
    }

    const serverId = invitation.serverId;
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    // add if not present using $addToSet
    await Server.findByIdAndUpdate(serverId, {
      $addToSet: { members: { userId: receiverUserId } },
    });

    // remove invitation
    await Invitation.findByIdAndDelete(id);

    return res.status(200).json({ message: "Invitation accepted" });
  } catch (error) {
    console.error("acceptInvitation error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const fetchInvitations = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const invitations = await Invitation.find({ receiverUserId: userId });

    const invitationsWithServerDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const server = await Server.findById(invitation.serverId);
        return {
          ...invitation._doc,
          serverName: server?.name ?? null,
          serverImage: server?.image ?? null,
        };
      })
    );

    return res.status(200).json({ invitations: invitationsWithServerDetails });
  } catch (error) {
    console.error("fetchInvitations error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const fetchInviteUsers = async (req, res) => {
  try {
    const { name } = req.query;
    const { serverId } = req.params;

    // fetch server if provided (serverId may be invalid or missing)
    let server = null;
    if (serverId) {
      if (!mongoose.Types.ObjectId.isValid(serverId)) {
        return res.status(400).json({ message: "Invalid serverId" });
      }
      server = await Server.findById(serverId).lean();
    }

    // build username search (case-insensitive). If name is not provided we'll return all users.
    const search = name ? { username: { $regex: new RegExp(name, "i") } } : {};

    // only select safe fields
    const users = await User.find(search, {
      username: 1,
      profileImage: 1,
    }).lean();

    // If server exists, compute membership map to speed membership checks
    const memberSet = new Set();
    if (server && Array.isArray(server.members)) {
      server.members.forEach((m) => {
        // m.userId may be ObjectId; normalize to string
        try {
          memberSet.add(String(m.userId));
        } catch {}
      });
    }

    const result = users.map((u) => ({
      _id: u._id,
      username: u.username,
      profileImage: u.profileImage || "",
      // invite true if server not provided or if user is NOT already a member
      invite: server ? !memberSet.has(String(u._id)) : true,
    }));

    return res.status(200).json({ users: result });
  } catch (error) {
    console.error("fetchInviteUsers error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};
