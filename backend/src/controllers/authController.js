import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
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
