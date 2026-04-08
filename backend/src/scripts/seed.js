import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Playlist } from "../models/Playlist.js";
import { Song } from "../models/Song.js";
import { User } from "../models/User.js";

const demoSongs = [
  {
    title: "Night Train",
    artist: "Mina Lee",
    genre: "Indie Pop",
    audioUrl: "https://example.com/audio/night-train.mp3",
    coverUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
    duration: 201,
  },
  {
    title: "Golden Hour Loop",
    artist: "Rio Miles",
    genre: "Lo-fi",
    audioUrl: "https://example.com/audio/golden-hour-loop.mp3",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
    duration: 178,
  },
  {
    title: "Summer Echo",
    artist: "Nova K",
    genre: "Alt R&B",
    audioUrl: "https://example.com/audio/summer-echo.mp3",
    coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
    duration: 244,
  },
  {
    title: "Neon Dust",
    artist: "The Amber Set",
    genre: "Electronic",
    audioUrl: "https://example.com/audio/neon-dust.mp3",
    coverUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
    duration: 227,
  },
];

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

  const admin = await User.findOneAndUpdate(
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

  for (const song of demoSongs) {
    await Song.findOneAndUpdate(
      { title: song.title, artist: song.artist },
      song,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }

  const songs = await Song.find({}).sort({ createdAt: -1 }).limit(4);

  await Playlist.findOneAndUpdate(
    { owner: admin._id, name: "Demo Favorites" },
    { owner: admin._id, name: "Demo Favorites", songs: songs.map((item) => item._id) },
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
