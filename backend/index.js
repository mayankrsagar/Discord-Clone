// server.js
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
// optional utilities (install with `npm i morgan helmet` if you want them)
import morgan from 'morgan';
import { Server as SocketIO } from 'socket.io';

// DB connection
import connectToDb from './db/config.js';
import channelRoutes from './routes/channelRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import userRoutes from './routes/userRoutes.js';

config();
const app = express();
const server = http.createServer(app);

// optional security + logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}
app.use(helmet());

// parse cookies and body
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - prefer env override
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://discord-clone-red-delta.vercel.app"
)
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(
        new Error("CORS policy: This origin is not allowed"),
        false
      );
    },
    credentials: true,
  })
);

// Connect to DB
connectToDb();

// Basic health check
app.get("/health", (req, res) =>
  res.status(200).json({ ok: true, ts: Date.now() })
);

// Routes (mount your routers)
app.use(userRoutes);
app.use(serverRoutes);
app.use(channelRoutes);
app.use(messageRoutes);
app.use(invitationRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// Error handler (centralized)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Socket.IO
const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// expose io globally to controllers
global.io = io;

// onlineUsers map: Map<serverId, Set<userId>>
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("userOnline", ({ serverId, userId }) => {
    if (!global.onlineUsers.has(serverId)) {
      global.onlineUsers.set(serverId, new Set());
    }
    global.onlineUsers.get(serverId).add(userId);
    socket.join(serverId);
    io.to(serverId).emit(
      "onlineUsersCount",
      global.onlineUsers.get(serverId).size
    );
  });

  socket.on("joinChannel", ({ channelId }) => {
    if (channelId) socket.join(channelId);
  });

  socket.on("leaveChannel", ({ channelId }) => {
    if (channelId) socket.leave(channelId);
  });

  socket.on("sendMessage", ({ channelId, message, userId, date, username }) => {
    // Optional: server can forward a transient message — persistent store happens in POST /message
    if (channelId) {
      io.to(channelId).emit("message", {
        _id: null,
        userId,
        message,
        date,
        username,
      });
    }
  });

  socket.on("serverDisconnect", ({ serverId, userId }) => {
    if (global.onlineUsers.has(serverId)) {
      global.onlineUsers.get(serverId).delete(userId);
      io.to(serverId).emit("userOffline", userId);
      io.to(serverId).emit(
        "onlineUsersCount",
        global.onlineUsers.get(serverId).size
      );
    }
  });

  socket.on("disconnect", (reason) => {
    // optional: log disconnects for debugging
    // console.log(`Socket disconnected: ${socket.id} - ${reason}`);
  });
});

// graceful shutdown
const shutdown = async () => {
  console.log("Shutting down server...");
  try {
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// unhandled rejections / exceptions
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1); // allow process manager (pm2, heroku) to restart
});
