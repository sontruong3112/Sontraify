import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

let ioInstance = null;
const connectedUsers = new Map();

const normalizeOrigin = (value = "") => String(value).trim().replace(/\/$/, "");

const allowedClientOrigins = String(env.clientOrigin || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  if (allowedClientOrigins.includes(normalized)) {
    return true;
  }

  return (
    normalized.startsWith("http://localhost:") ||
    normalized.startsWith("http://127.0.0.1:")
  );
};

const resolveHandshakeToken = (socket) => {
  return (
    String(socket.handshake?.auth?.token || "").trim() ||
    String(socket.handshake?.query?.token || "").trim()
  );
};

export const initRealtimeSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const token = resolveHandshakeToken(socket);

    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      socket.data.userId = String(payload.userId || "");
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = String(socket.data.userId || "").trim();

    if (userId) {
      socket.join(`user:${userId}`);
      markUserConnection(userId, true);
    }

    socket.on("chat:join", ({ friendId } = {}) => {
      const value = String(friendId || "").trim();
      if (!value) {
        return;
      }

      const roomId = [userId, value].sort().join(":");
      socket.join(`chat:${roomId}`);
    });

    socket.on("disconnect", () => {
      if (userId) {
        markUserConnection(userId, false);
      }
    });
  });

  return ioInstance;
};

export const emitRealtimeMessage = ({ participantIds = [], message }) => {
  if (!ioInstance || !message) {
    return;
  }

  participantIds.forEach((participantId) => {
    const userId = String(participantId || "").trim();
    if (!userId) {
      return;
    }

    ioInstance.to(`user:${userId}`).emit("chat:message", message);
  });
};

export const emitConversationSeen = ({ participantIds = [], payload }) => {
  if (!ioInstance || !payload) {
    return;
  }

  participantIds.forEach((participantId) => {
    const userId = String(participantId || "").trim();
    if (!userId) {
      return;
    }

    ioInstance.to(`user:${userId}`).emit("chat:seen", payload);
  });
};

export const isUserOnline = (userId) => {
  const key = String(userId || "").trim();
  if (!key) {
    return false;
  }

  return (connectedUsers.get(key) || 0) > 0;
};

const markUserConnection = async (userId, isConnected) => {
  const currentCount = connectedUsers.get(userId) || 0;
  const nextCount = isConnected ? currentCount + 1 : Math.max(0, currentCount - 1);

  if (nextCount <= 0) {
    connectedUsers.delete(userId);
  } else {
    connectedUsers.set(userId, nextCount);
  }

  const becameOnline = currentCount === 0 && nextCount > 0;
  const becameOffline = currentCount > 0 && nextCount === 0;

  if (!becameOnline && !becameOffline) {
    return;
  }

  await emitPresenceUpdateToFriends(userId, nextCount > 0);
};

const emitPresenceUpdateToFriends = async (userId, isOnline) => {
  if (!ioInstance) {
    return;
  }

  const user = await User.findById(userId).select("friendIds");
  const friendIds = Array.isArray(user?.friendIds)
    ? user.friendIds.map((item) => item.toString())
    : [];

  friendIds.forEach((friendId) => {
    ioInstance.to(`user:${friendId}`).emit("presence:update", {
      userId,
      isOnline,
      at: new Date().toISOString(),
    });
  });
};
