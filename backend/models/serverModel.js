import mongoose from 'mongoose';

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  image: { type: String },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: { type: String, default: "member" }, // can be "mod" or "owner"
      ban: { type: Boolean, default: false },
    },
  ],
  inviteCode: { type: String },
});

const Server = mongoose.models.Server || mongoose.model("Server", ServerSchema);

export default Server;
