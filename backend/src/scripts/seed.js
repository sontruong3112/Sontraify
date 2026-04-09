import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Playlist } from "../models/Playlist.js";
import { Song } from "../models/Song.js";
import { User } from "../models/User.js";

const getAdminCredentials = () => {
  return {
    name: process.env.SEED_ADMIN_NAME || "Demo Admin",
    email: process.env.SEED_ADMIN_EMAIL || "admin@music.local",
    password: process.env.SEED_ADMIN_PASSWORD || "admin123",
  };
};

const run = async () => {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required for seed script");
  }

  const reset = process.argv.includes("--reset");
  const { name, email, password } = getAdminCredentials();

  await mongoose.connect(env.mongodbUri);

  if (reset) {
    await Promise.all([
      Playlist.deleteMany({}),
      Song.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      role: "admin",
      passwordHash,
      refreshTokenHash: null,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log("Seed completed");
  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);
};

run()
  .catch((error) => {
    console.error("Seed failed", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
