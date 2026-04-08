import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { fail, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
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
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
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
