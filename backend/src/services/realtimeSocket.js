import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

let ioInstance = null;
const connectedUsers = new Map();
const userActivities = new Map();

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

    socket.on("presence:activity", (payload = {}) => {
      if (!userId) {
        return;
      }

      const nextActivity = normalizeUserActivityPayload(payload);

      if (!nextActivity) {
        userActivities.delete(userId);
        emitActivityUpdateToFriends(userId, null);
        return;
      }

      userActivities.set(userId, nextActivity);
      emitActivityUpdateToFriends(userId, nextActivity);
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

export const getUserActivity = (userId) => {
  const key = String(userId || "").trim();
  if (!key) {
    return null;
  }

  return userActivities.get(key) || null;
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

const normalizeUserActivityPayload = (payload = {}) => {
  const songId = String(payload.songId || "").trim();
  const title = String(payload.title || "").trim();
  const artist = String(payload.artist || "").trim();
  const coverUrl = String(payload.coverUrl || "").trim();
  const isPlaying = Boolean(payload.isPlaying);

  if (!songId || !title || !artist || !isPlaying) {
    return null;
  }

  return {
    songId,
    title,
    artist,
    coverUrl,
    isPlaying: true,
    at: new Date().toISOString(),
  };
};

const emitActivityUpdateToFriends = async (userId, activity) => {
  if (!ioInstance) {
    return;
  }

  const user = await User.findById(userId).select("friendIds");
  const friendIds = Array.isArray(user?.friendIds)
    ? user.friendIds.map((item) => item.toString())
    : [];

  friendIds.forEach((friendId) => {
    ioInstance.to(`user:${friendId}`).emit("presence:activity", {
      userId,
      activity,
    });
  });
};
