import mongoose from 'mongoose';

const ServerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: { type: String, default: "" }, // secure_url
    imagePublicId: { type: String, default: "" }, // cloudinary public_id
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
    inviteCode: { type: String, default: "" },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

const Server = mongoose.models.Server || mongoose.model("Server", ServerSchema);

export default Server;
