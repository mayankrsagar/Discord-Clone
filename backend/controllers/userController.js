// backend/controllers/userController.js
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import Server from '../models/serverModel.js';
import User from '../models/userModel.js';
import {
  destroyImage,
  handleUpload,
} from '../utils/cloudinary.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// ---- Register ----
export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ message: "username, email and password required" });
    }

    const usernameCheck = await User.findOne({ username });
    if (usernameCheck) {
      return res.status(400).json({ message: "Username already used" });
    }

    const emailCheck = await User.findOne({ email });
    if (emailCheck) {
      return res
        .status(400)
        .json({ message: "Email is already registered!", status: false });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
    });

    // Optionally auto-login (uncomment when needed)
    // const payload = { username: newUser.username, email, userId: newUser._id };
    // const jwtToken = jwt.sign(payload, JWT_SECRET);
    // res.cookie("discordToken", jwtToken, { httpOnly: true, secure: true, sameSite: "None", maxAge: 24*60*60*1000 });

    const userObj = newUser.toObject();
    delete userObj.password;
    res
      .status(201)
      .json({ message: "User created successfully", user: userObj });
  } catch (error) {
    console.error("register error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ---- Login ----
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email is not registered!", status: false });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Incorrect Password :(" });
    }

    const payload = { username: user.username, email, userId: user._id };
    const jwtToken = jwt.sign(payload, JWT_SECRET);

    res
      .cookie("discordToken", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ message: "Login successful" });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ---- Update Profile (editProfile) ----
export const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const fileBuffer = req.file?.buffer || null;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If username changed, ensure uniqueness
    if (username && username.trim() && username.trim() !== user.username) {
      const exists = await User.findOne({ username: username.trim() });
      if (exists)
        return res.status(400).json({ message: "Username already taken" });
      user.username = username.trim();
    }

    // Update bio explicitly (allow empty string)
    if (typeof bio !== "undefined") {
      user.bio = bio;
    }

    // Handle new avatar image
    if (fileBuffer) {
      let uploadRes;
      try {
        uploadRes = await handleUpload(fileBuffer, { folder: "users/avatars" });
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }

      // delete previous image from Cloudinary (best-effort)
      try {
        if (user.profileImagePublicId) {
          await destroyImage(user.profileImagePublicId);
        }
      } catch (destroyErr) {
        console.warn("Failed to delete previous Cloudinary image:", destroyErr);
      }

      user.profileImage = uploadRes.secure_url || user.profileImage;
      user.profileImagePublicId =
        uploadRes.public_id || user.profileImagePublicId;
    }

    await user.save();

    const userObj = user.toObject();
    if (userObj.password) delete userObj.password;

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: userObj });
  } catch (error) {
    console.error("updateProfile error:", error);
    if (error?.code === 11000 && error.keyPattern?.username) {
      return res.status(400).json({ message: "Username already taken" });
    }
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ---- Get user profile (userProfile) ----
export const userProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.password) delete user.password;
    res.status(200).json({ user, message: "Successfully fetched user" });
  } catch (error) {
    console.error("userProfile error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ---- Fetch users for invite (fetchInviteUsers) ----
// GET /invite/users?name=...  (serverId in params)
export const fetchInviteUsers = async (req, res) => {
  try {
    const { name } = req.query;
    const { serverId } = req.params;

    const server = await Server.findById(serverId);
    const users = await User.find().lean();

    if (!server) {
      // still return users with invite flag true (no server membership)
      const result = users
        .filter((u) =>
          name ? u.username.toLowerCase().includes(name.toLowerCase()) : true
        )
        .map((u) => ({ ...u, invite: true }));
      return res.status(200).json({ users: result });
    }

    let filtered = users;
    if (name) {
      filtered = users.filter((u) =>
        u.username.toLowerCase().includes(name.toLowerCase())
      );
    }

    const result = filtered.map((u) => {
      const isMember = server.members.some((m) => m.userId.equals(u._id));
      return { ...u, invite: !isMember };
    });

    res.status(200).json({ users: result });
  } catch (error) {
    console.error("fetchInviteUsers error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ---- Get user by id (public) ----
// GET /user/:id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "User id required" });

    // Find user by id, return lean object
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove sensitive fields
    if (user.password) delete user.password;
    if (user.profileImagePublicId) delete user.profileImagePublicId;

    // Normalize avatar field name to `profileImage` (already used in updateProfile)
    // Return user object
    res.status(200).json({ user });
  } catch (error) {
    console.error("getUserById error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
