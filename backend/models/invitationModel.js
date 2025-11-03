import mongoose from 'mongoose';

const InvitationSchema = new mongoose.Schema({
  receiverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  inviterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
  },
});

const Invitation =
  mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);

export default Invitation;
