import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';

// DB connection
import connectToDb from './db/config.js';
import channelRoutes from './routes/channelRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
// Routes
import userRoutes from './routes/userRoutes.js';

config();
const app = express();
app.use(cookieParser()); // ✅ parse cookies
const server = http.createServer(app);

// ✅ Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://discord-clone-red-delta.vercel.app",
    ], // 👈 your frontend origin
    credentials: true,
  })
);
app.use(express.json());

// ✅ Connect to MongoDB
connectToDb();

// ✅ Routes
app.use(userRoutes);
app.use(serverRoutes);
app.use(channelRoutes);
app.use(messageRoutes);
app.use(invitationRoutes);

// ✅ Start server
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ✅ Socket.IO setup
const io = new SocketIO(server, {
  cors: {
    origin: [
      "http://localhost:5173", // 👈 match frontend
      "https://discord-clone-red-delta.vercel.app",
    ],
    credentials: true,
  },
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("userOnline", ({ serverId, userId }) => {
    if (!onlineUsers[serverId]) onlineUsers[serverId] = new Set();
    onlineUsers[serverId].add(userId);

    socket.join(serverId);
    io.to(serverId).emit("onlineUsersCount", onlineUsers[serverId].size);
  });

  socket.on("joinChannel", ({ channelId }) => {
    socket.join(channelId);
  });

  socket.on("leaveChannel", ({ channelId }) => {
    socket.leave(channelId);
  });

  socket.on("sendMessage", ({ channelId, message, userId, date, username }) => {
    io.to(channelId).emit("message", { userId, message, date, username });
  });

  socket.on("serverDisconnect", ({ serverId, userId }) => {
    if (onlineUsers[serverId]) {
      onlineUsers[serverId].delete(userId);
      io.to(serverId).emit("userOffline", userId);
    }
  });
});
