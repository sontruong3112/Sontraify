import test from "node:test";
import assert from "node:assert/strict";

import { env } from "../../config/env.js";
import { getUploadSignature } from "../uploadController.js";

const buildRes = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  return response;
};

const withCloudinaryConfig = async (fn) => {
  const snapshot = {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    apiSecret: env.cloudinaryApiSecret,
    folder: env.cloudinaryFolder,
  };

  env.cloudinaryCloudName = "demo-cloud";
  env.cloudinaryApiKey = "demo-key";
  env.cloudinaryApiSecret = "demo-secret";
  env.cloudinaryFolder = "music-app";

  try {
    await fn();
  } finally {
    env.cloudinaryCloudName = snapshot.cloudName;
    env.cloudinaryApiKey = snapshot.apiKey;
    env.cloudinaryApiSecret = snapshot.apiSecret;
    env.cloudinaryFolder = snapshot.folder;
  }
};

test("rejects non-admin video upload signatures", async () => {
  await withCloudinaryConfig(async () => {
    const req = {
      body: {
        resourceType: "video",
        folder: "music-app/audio",
      },
      user: {
        role: "user",
      },
    };
    const res = buildRes();

    getUploadSignature(req, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.equal(res.payload?.success, false);
    assert.match(String(res.payload?.message || ""), /only admin/i);
  });
});

test("rejects user uploads to folders outside allowed list", async () => {
  await withCloudinaryConfig(async () => {
    const req = {
      body: {
        resourceType: "image",
        folder: "music-app/covers",
      },
      user: {
        role: "user",
      },
    };
    const res = buildRes();

    getUploadSignature(req, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.equal(res.payload?.success, false);
    assert.match(String(res.payload?.message || ""), /permission/i);
  });
});

test("allows user image signatures for avatar folder", async () => {
  await withCloudinaryConfig(async () => {
    const req = {
      body: {
        resourceType: "image",
        folder: "music-app/avatars",
      },
      user: {
        role: "user",
      },
    };
    const res = buildRes();

    getUploadSignature(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload?.success, true);
    assert.equal(res.payload?.resourceType, "image");
    assert.equal(res.payload?.folder, "music-app/avatars");
    assert.ok(res.payload?.signature);
  });
});

test("allows admin video signatures", async () => {
  await withCloudinaryConfig(async () => {
    const req = {
      body: {
        resourceType: "video",
        folder: "music-app/audio",
      },
      user: {
        role: "admin",
      },
    };
    const res = buildRes();

    getUploadSignature(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload?.success, true);
    assert.equal(res.payload?.resourceType, "video");
    assert.equal(res.payload?.folder, "music-app/audio");
    assert.ok(res.payload?.signature);
  });
});
