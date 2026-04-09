import crypto from "node:crypto";
import { env } from "../config/env.js";
import { fail, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allowedResourceTypes = new Set(["image", "video"]);

const normalizePathSegment = (value) => {
  return String(value || "").trim().replace(/\/+$/, "");
};

const isAllowedUserFolder = (folder, baseFolder) => {
  const allowed = new Set([
    `${baseFolder}/avatars`,
    `${baseFolder}/playlist-covers`,
  ]);

  return allowed.has(folder);
};

const sanitizeFolder = (folder) => {
  const raw = String(folder || "").trim();

  if (!raw) {
    return env.cloudinaryFolder;
  }

  return raw.replace(/[^a-zA-Z0-9/_-]/g, "");
};

export const getUploadSignature = asyncHandler(async (req, res) => {
  const resourceType = String(req.body?.resourceType || "image").trim();
  const folder = sanitizeFolder(req.body?.folder);

  if (!allowedResourceTypes.has(resourceType)) {
    return fail(res, {
      statusCode: 400,
      message: "Invalid resourceType. Use image or video",
    });
  }

  const userRole = String(req.user?.role || "").trim();
  const baseFolder = normalizePathSegment(env.cloudinaryFolder || "music-app") || "music-app";

  if (resourceType === "video" && userRole !== "admin") {
    return fail(res, {
      statusCode: 403,
      message: "Only admin can upload video",
    });
  }

  if (userRole !== "admin" && !isAllowedUserFolder(folder, baseFolder)) {
    return fail(res, {
      statusCode: 403,
      message: "You do not have permission to upload to this folder",
    });
  }

  const missing = [];

  if (!env.cloudinaryCloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!env.cloudinaryApiKey) missing.push("CLOUDINARY_API_KEY");
  if (!env.cloudinaryApiSecret) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length > 0) {
    return fail(res, {
      statusCode: 500,
      message: `Cloudinary is not configured on server. Missing: ${missing.join(", ")}`,
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(`${paramsToSign}${env.cloudinaryApiSecret}`)
    .digest("hex");

  return ok(res, {
    data: {
      cloudName: env.cloudinaryCloudName,
      apiKey: env.cloudinaryApiKey,
      timestamp,
      signature,
      folder,
      resourceType,
    },
    extra: {
      cloudName: env.cloudinaryCloudName,
      apiKey: env.cloudinaryApiKey,
      timestamp,
      signature,
      folder,
      resourceType,
    },
  });
});
