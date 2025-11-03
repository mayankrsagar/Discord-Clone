import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import Server from '../models/serverModel.js';
import User from '../models/userModel.js';

export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const usernameCheck = await User.findOne({ username });
    if (usernameCheck) {
      return res.status(400).json({ message: "Username already used" });
    }

    const emailCheck = await User.findOne({ email });
    if (emailCheck) {
      return res.status(400).json({
        message: "Email is already registered!",
        status: false,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      email,
      username,
      password: hashedPassword,
    });

    // might need this later to directly login to discord
    // const user = await User.findOne({ email });
    // const payload = {
    //   username: user.username,
    //   email,
    //   userId: user._id,
    // };
    // const jwtToken = jwt.sign(payload, process.env.JWT_SECRET);
    // res.cookie("discordToken", jwtToken, {
    //   httpOnly: true,
    //   maxAge: 24 * 60 * 60 * 1000, // 1 day,
    //   secure: true,
    // });
    // return res.status(201).json({ jwtToken });
    return res.status(201).json({ message: "user created successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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
    const payload = {
      username: user.username,
      email,
      userId: user._id,
    };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET);
    // login controller
    res
      .status(200)
      .cookie("discordToken", jwtToken, {
        // httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        // secure: true, // localhost false
        // sameSite: "none",
        // path: "/",
      })
      .json({ message: "Login successful" }); // token is now in cookie, body optional
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const editProfile = async (req, res) => {
  try {
    const { username, password, profileImage } = req.body;
    const { email } = req.user;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.updateOne(
      { email },
      {
        $set: {
          username,
          password: hashedPassword,
          profileImage,
        },
      }
    );

    const user = await User.findOne({ email });
    // const payload = {
    //   username,
    //   email,
    //   userId: user._id,
    // };

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

export const userProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    return res.status(200).json({ user, message: "Successfully fetched user" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const fetchInviteUsers = async (req, res) => {
  try {
    const { name } = req.query;
    const { serverId } = req.params;

    const [users, server] = await Promise.all([
      User.find(),
      Server.findById(serverId),
    ]);

    let filteredUsers = users;
    if (name) {
      filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(name.toLowerCase())
      );
    }

    const result = filteredUsers.map((u) => {
      const isMember = server.members.some((m) => m.userId.equals(u._id));
      return { ...u._doc, invite: !isMember };
    });

    return res.status(200).json({ users: result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
