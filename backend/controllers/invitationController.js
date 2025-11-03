import mongoose from 'mongoose';

import Invitation from '../models/invitationModel.js';
import Server from '../models/serverModel.js';

export const addInvitation = async (req, res) => {
  try {
    const { receiverUserId, inviterUserId, serverId } = req.body;

    await Invitation.create({
      receiverUserId,
      inviterUserId,
      serverId,
    });

    res.status(201).json({ message: "Invitation sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    await Invitation.findByIdAndDelete(id);
    res.status(200).json({ message: "Invitation rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiverUserId, serverId } = req.body;
    const server = await Server.findById(serverId);

    const isMember = server.members.some((m) => m.userId === receiverUserId);
    if (isMember) {
      await Invitation.findByIdAndDelete(id);
      return res.status(200).json({ message: "Already in server" });
    }

    await Server.findByIdAndUpdate(new mongoose.Types.ObjectId(serverId), {
      $push: {
        members: {
          userId: receiverUserId,
        },
      },
    });

    await Invitation.findByIdAndDelete(id);
    res.status(200).json({ message: "Invitation accepted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const fetchInvitations = async (req, res) => {
  try {
    const { userId } = req.user;

    const invitations = await Invitation.find({ receiverUserId: userId });

    const invitationsWithServerDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const { name, image } = await Server.findById(invitation.serverId);
        return {
          ...invitation._doc,
          name,
          image,
        };
      })
    );

    res.status(200).json({ invitations: invitationsWithServerDetails });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
