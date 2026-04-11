import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { fail, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const isProduction = env.nodeEnv === "production";

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl || "",
});

const signTokens = (user) => {
  const payload = { userId: user._id.toString(), role: user.role };

  const accessToken = jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });

  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    // Cross-origin frontend (Render) -> backend (Railway) requires SameSite=None in production.
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
};

const issueTokenPair = async (user, res) => {
  const { accessToken, refreshToken } = signTokens(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  setRefreshCookie(res, refreshToken);

  return { accessToken, refreshToken };
};

const extractRefreshToken = (req) => {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || "";
};

const decodeAccessToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    return jwt.verify(token, env.jwtAccessSecret);
  } catch {
    return null;
  }
};

const normalizeSongIdList = (value, { maxLength = 100 } = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const item of value) {
    const id = String(item || "").trim();

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);

    if (result.length >= maxLength) {
      break;
    }
  }

  return result;
};

const normalizeQueueIdList = (value, { maxLength = 200 } = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const result = [];

  for (const item of value) {
    const id = String(item || "").trim();

    if (!id) {
      continue;
    }

    result.push(id);

    if (result.length >= maxLength) {
      break;
    }
  }

  return result;
};

const isValidRole = (value) => {
  return ["user", "admin"].includes(String(value || "").trim());
};

const buildMusicPreferences = (user) => ({
  likedSongIds: (user.likedSongIds || []).map((id) => id.toString()),
  recentTrackIds: (user.recentTrackIds || []).map((id) => id.toString()),
  queuedTrackIds: (user.queuedTrackIds || []).map((id) => id.toString()),
});

const syncRecentTrack = (recentTrackIds, songId, limit = 100) => {
  const next = [songId, ...recentTrackIds.filter((id) => id !== songId)];
  return next.slice(0, limit);
};

const hasValidGoogleClientId = (clientId) => {
  const value = String(clientId || "").trim();
  return (
    value.length > 0 &&
    value.includes(".apps.googleusercontent.com") &&
    !value.startsWith("your_")
  );
};

const fetchGoogleTokenInfo = async (accessToken) => {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(
      accessToken
    )}`
  );

  if (!response.ok) {
    throw new Error("Google token is invalid");
  }

  return response.json();
};

const fetchGoogleUserInfo = async (accessToken) => {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch Google profile");
  }

  return response.json();
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return fail(res, {
      statusCode: 409,
      message: "Email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const tokens = await issueTokenPair(user, res);

  return ok(res, {
    statusCode: 201,
    message: "Registered successfully",
    data: {
      user: buildUserResponse(user),
      tokens,
    },
    extra: {
      user: buildUserResponse(user),
      tokens,
    },
  });
});

const loginByRole = async (req, res, allowedRoles = ["user", "admin"]) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return fail(res, {
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return fail(res, {
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  if (!allowedRoles.includes(user.role)) {
    return fail(res, {
      statusCode: 403,
      message: "Insufficient permissions",
    });
  }

  const tokens = await issueTokenPair(user, res);

  return ok(res, {
    message: "Logged in successfully",
    data: {
      user: buildUserResponse(user),
      tokens,
    },
    extra: {
      user: buildUserResponse(user),
      tokens,
    },
  });
};

export const login = asyncHandler(async (req, res) => {
  return loginByRole(req, res, ["user", "admin"]);
});

export const googleLogin = asyncHandler(async (req, res) => {
  const accessToken = String(req.body?.accessToken || "").trim();

  if (env.nodeEnv === "production" && !hasValidGoogleClientId(env.googleClientId)) {
    return fail(res, {
      statusCode: 503,
      message: "Google login is not configured on server",
    });
  }

  if (!accessToken) {
    return fail(res, {
      statusCode: 400,
      message: "accessToken is required",
    });
  }

  const [tokenInfo, profile] = await Promise.all([
    fetchGoogleTokenInfo(accessToken),
    fetchGoogleUserInfo(accessToken),
  ]);

  const audience = String(tokenInfo?.aud || "").trim();
  const email = String(profile?.email || "").trim().toLowerCase();
  const googleId = String(profile?.sub || "").trim();
  const emailVerified = profile?.email_verified === true;

  if (!email || !googleId || !emailVerified) {
    return fail(res, {
      statusCode: 401,
      message: "Google account is not verified",
    });
  }

  if (hasValidGoogleClientId(env.googleClientId) && audience !== env.googleClientId) {
    return fail(res, {
      statusCode: 401,
      message: "Google token audience mismatch",
    });
  }

  const displayName = String(profile?.name || "").trim() || email.split("@")[0];
  const avatarUrl = String(profile?.picture || "").trim();
  const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: displayName,
      email,
      passwordHash: randomPasswordHash,
      authProvider: "google",
      googleId,
      avatarUrl,
    });
  } else {
    user.name = user.name || displayName;
    user.authProvider = "google";
    user.googleId = googleId;
    user.avatarUrl = avatarUrl || user.avatarUrl;
    await user.save();
  }

  const tokens = await issueTokenPair(user, res);

  return ok(res, {
    message: "Logged in with Google",
    data: {
      user: buildUserResponse(user),
      tokens,
    },
    extra: {
      user: buildUserResponse(user),
      tokens,
    },
  });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  return loginByRole(req, res, ["admin"]);
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);

  if (!refreshToken) {
    return fail(res, {
      statusCode: 401,
      message: "Refresh token is required",
    });
  }

  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    return fail(res, {
      statusCode: 401,
      message: "Invalid or expired refresh token",
    });
  }

  const user = await User.findById(payload.userId);

  if (!user || !user.refreshTokenHash) {
    return fail(res, {
      statusCode: 401,
      message: "Refresh token is invalid",
    });
  }

  const isRefreshTokenMatch = user.refreshTokenHash === hashToken(refreshToken);

  if (!isRefreshTokenMatch) {
    return fail(res, {
      statusCode: 401,
      message: "Refresh token is invalid",
    });
  }

  const tokens = await issueTokenPair(user, res);

  return ok(res, {
    message: "Token refreshed",
    data: { tokens },
    extra: { tokens },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  const accessPayload = decodeAccessToken(req.headers.authorization);
  let user = null;

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
      user = await User.findById(payload.userId);

      if (user && user.refreshTokenHash !== hashToken(refreshToken)) {
        user = null;
      }
    } catch {
      user = null;
    }
  }

  if (!user && accessPayload?.userId) {
    user = await User.findById(accessPayload.userId);
  }

  if (user) {
    user.refreshTokenHash = null;
    await user.save();
  }

  clearRefreshCookie(res);

  return ok(res, {
    message: "Logged out successfully",
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  return ok(res, {
    data: { user: buildUserResponse(user) },
    extra: { user: buildUserResponse(user) },
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  const hasName = Object.prototype.hasOwnProperty.call(req.body, "name");
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(req.body, "avatarUrl");

  if (!hasName && !hasAvatarUrl) {
    return fail(res, {
      statusCode: 400,
      message: "No profile fields to update",
    });
  }

  if (hasName) {
    user.name = String(req.body.name || "").trim();
  }

  if (hasAvatarUrl) {
    user.avatarUrl = String(req.body.avatarUrl || "").trim();
  }

  await user.save();

  return ok(res, {
    message: "Profile updated",
    data: { user: buildUserResponse(user) },
    extra: { user: buildUserResponse(user) },
  });
});

export const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "likedSongIds recentTrackIds queuedTrackIds"
  );

  if (!user) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  return ok(res, {
    data: {
      preferences: buildMusicPreferences(user),
    },
    extra: {
      preferences: buildMusicPreferences(user),
    },
  });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "likedSongIds recentTrackIds queuedTrackIds"
  );

  if (!user) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  const hasLiked = Object.prototype.hasOwnProperty.call(req.body, "likedSongIds");
  const hasRecent = Object.prototype.hasOwnProperty.call(req.body, "recentTrackIds");
  const hasQueue = Object.prototype.hasOwnProperty.call(req.body, "queuedTrackIds");

  if (!hasLiked && !hasRecent && !hasQueue) {
    return fail(res, {
      statusCode: 400,
      message: "No preference fields to update",
    });
  }

  if (hasLiked) {
    user.likedSongIds = normalizeSongIdList(req.body.likedSongIds, {
      maxLength: 500,
    });
  }

  if (hasRecent) {
    user.recentTrackIds = normalizeSongIdList(req.body.recentTrackIds, {
      maxLength: 100,
    });
  }

  if (hasQueue) {
    user.queuedTrackIds = normalizeQueueIdList(req.body.queuedTrackIds, {
      maxLength: 200,
    });
  }

  await user.save();

  return ok(res, {
    message: "Preferences updated",
    data: {
      preferences: buildMusicPreferences(user),
    },
    extra: {
      preferences: buildMusicPreferences(user),
    },
  });
});

export const applyPreferenceAction = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "likedSongIds recentTrackIds queuedTrackIds"
  );

  if (!user) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  const action = String(req.body?.action || "").trim();
  const songId = String(req.body?.songId || "").trim();
  const index = Number(req.body?.index);
  const direction = Number(req.body?.direction);

  switch (action) {
    case "like_add": {
      if (!songId) {
        return fail(res, { statusCode: 400, message: "songId is required" });
      }
      user.likedSongIds = normalizeSongIdList([songId, ...user.likedSongIds], {
        maxLength: 500,
      });
      break;
    }
    case "like_remove": {
      if (!songId) {
        return fail(res, { statusCode: 400, message: "songId is required" });
      }
      user.likedSongIds = user.likedSongIds.filter((id) => id.toString() !== songId);
      break;
    }
    case "recent_push": {
      if (!songId) {
        return fail(res, { statusCode: 400, message: "songId is required" });
      }
      user.recentTrackIds = syncRecentTrack(
        user.recentTrackIds.map((id) => id.toString()),
        songId,
        100
      );
      break;
    }
    case "queue_add_next": {
      if (!songId) {
        return fail(res, { statusCode: 400, message: "songId is required" });
      }
      user.queuedTrackIds = normalizeQueueIdList([songId, ...user.queuedTrackIds], {
        maxLength: 200,
      });
      break;
    }
    case "queue_add_last": {
      if (!songId) {
        return fail(res, { statusCode: 400, message: "songId is required" });
      }
      user.queuedTrackIds = normalizeQueueIdList([...user.queuedTrackIds, songId], {
        maxLength: 200,
      });
      break;
    }
    case "queue_remove_at": {
      if (!Number.isInteger(index) || index < 0 || index >= user.queuedTrackIds.length) {
        return fail(res, { statusCode: 400, message: "Valid index is required" });
      }

      user.queuedTrackIds = user.queuedTrackIds.filter((_, itemIndex) => itemIndex !== index);
      break;
    }
    case "queue_move": {
      if (!Number.isInteger(index) || !Number.isInteger(direction)) {
        return fail(res, { statusCode: 400, message: "index and direction are required" });
      }

      const targetIndex = index + direction;

      if (
        index < 0 ||
        targetIndex < 0 ||
        index >= user.queuedTrackIds.length ||
        targetIndex >= user.queuedTrackIds.length
      ) {
        return fail(res, { statusCode: 400, message: "Invalid move indexes" });
      }

      const next = [...user.queuedTrackIds];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      user.queuedTrackIds = next;
      break;
    }
    case "queue_clear": {
      user.queuedTrackIds = [];
      break;
    }
    case "queue_consume_first": {
      if (user.queuedTrackIds.length > 0) {
        user.queuedTrackIds = user.queuedTrackIds.slice(1);
      }
      break;
    }
    default:
      return fail(res, {
        statusCode: 400,
        message: "Unsupported preference action",
      });
  }

  await user.save();

  return ok(res, {
    message: "Preference action applied",
    data: {
      preferences: buildMusicPreferences(user),
    },
    extra: {
      preferences: buildMusicPreferences(user),
    },
  });
});

export const listUsersForAdmin = asyncHandler(async (_req, res) => {
  const users = await User.find({})
    .select("name email role avatarUrl createdAt updatedAt")
    .sort({ createdAt: -1 });

  const items = users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  return ok(res, {
    data: { users: items },
    extra: { users: items },
  });
});

export const updateUserByAdmin = asyncHandler(async (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  const hasName = Object.prototype.hasOwnProperty.call(req.body, "name");
  const hasRole = Object.prototype.hasOwnProperty.call(req.body, "role");
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(req.body, "avatarUrl");

  if (!hasName && !hasRole && !hasAvatarUrl) {
    return fail(res, {
      statusCode: 400,
      message: "No user fields to update",
    });
  }

  if (hasName) {
    const nextName = String(req.body.name || "").trim();
    if (!nextName) {
      return fail(res, {
        statusCode: 400,
        message: "name cannot be empty",
      });
    }

    targetUser.name = nextName;
  }

  if (hasAvatarUrl) {
    targetUser.avatarUrl = String(req.body.avatarUrl || "").trim();
  }

  if (hasRole) {
    const nextRole = String(req.body.role || "").trim();
    if (!isValidRole(nextRole)) {
      return fail(res, {
        statusCode: 400,
        message: "Invalid role",
      });
    }

    if (req.user?.userId === targetUserId && nextRole !== "admin") {
      return fail(res, {
        statusCode: 400,
        message: "Admin cannot remove own admin role",
      });
    }

    targetUser.role = nextRole;
  }

  await targetUser.save();

  return ok(res, {
    message: "User updated",
    data: {
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        avatarUrl: targetUser.avatarUrl || "",
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    },
    extra: {
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        avatarUrl: targetUser.avatarUrl || "",
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    },
  });
});

export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();

  if (!targetUserId) {
    return fail(res, {
      statusCode: 400,
      message: "userId is required",
    });
  }

  if (req.user?.userId === targetUserId) {
    return fail(res, {
      statusCode: 400,
      message: "Admin cannot delete own account",
    });
  }

  const deleted = await User.findByIdAndDelete(targetUserId);

  if (!deleted) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  return ok(res, {
    message: "User deleted",
  });
});

export const resetUserPasswordByAdmin = asyncHandler(async (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();
  const newPassword = String(req.body?.newPassword || "").trim();

  if (!newPassword || newPassword.length < 6) {
    return fail(res, {
      statusCode: 400,
      message: "newPassword must be at least 6 characters",
    });
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return fail(res, {
      statusCode: 404,
      message: "User not found",
    });
  }

  targetUser.passwordHash = await bcrypt.hash(newPassword, 10);
  targetUser.refreshTokenHash = null;
  await targetUser.save();

  return ok(res, {
    message: "User password has been reset",
  });
});

export const sendNotificationByAdmin = asyncHandler(async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const message = String(req.body?.message || "").trim();
  const recipientUserId = String(req.body?.recipientUserId || "").trim();
  const sendToAll = req.body?.sendToAll === true;

  if (!title || !message) {
    return fail(res, {
      statusCode: 400,
      message: "title and message are required",
    });
  }

  if (!sendToAll && !recipientUserId) {
    return fail(res, {
      statusCode: 400,
      message: "recipientUserId is required when sendToAll=false",
    });
  }

  const adminUserId = String(req.user?.userId || "").trim();
  let recipientIds = [];

  if (sendToAll) {
    const users = await User.find({}).select("_id");
    recipientIds = users.map((item) => item._id.toString());
  } else {
    const targetUser = await User.findById(recipientUserId).select("_id");
    if (!targetUser) {
      return fail(res, {
        statusCode: 404,
        message: "Recipient user not found",
      });
    }
    recipientIds = [targetUser._id.toString()];
  }

  if (recipientIds.length === 0) {
    return fail(res, {
      statusCode: 400,
      message: "No recipients found",
    });
  }

  const payload = recipientIds.map((recipientId) => ({
    recipientId,
    createdByUserId: adminUserId,
    title,
    message,
  }));

  await Notification.insertMany(payload, { ordered: false });

  return ok(res, {
    statusCode: 201,
    message: "Notification sent",
    data: {
      count: payload.length,
    },
    extra: {
      count: payload.length,
    },
  });
});

export const listMyNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user?.userId || "").trim();
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));

  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });

  const items = notifications.map((item) => ({
    id: item._id.toString(),
    title: item.title,
    message: item.message,
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
    createdByUserId: item.createdByUserId?.toString() || "",
  }));

  return ok(res, {
    data: {
      notifications: items,
      unreadCount,
    },
    extra: {
      notifications: items,
      unreadCount,
    },
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notificationId = String(req.params.notificationId || "").trim();
  const userId = String(req.user?.userId || "").trim();

  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId,
  });

  if (!notification) {
    return fail(res, {
      statusCode: 404,
      message: "Notification not found",
    });
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return ok(res, {
    message: "Notification marked as read",
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = String(req.user?.userId || "").trim();

  await Notification.updateMany(
    {
      recipientId: userId,
      isRead: false,
    },
    {
      $set: { isRead: true },
    }
  );

  return ok(res, {
    message: "All notifications marked as read",
  });
});
