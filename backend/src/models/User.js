import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      default: "",
      index: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    likedSongIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Song",
        },
      ],
      default: [],
    },
    recentTrackIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Song",
        },
      ],
      default: [],
    },
    queuedTrackIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Song",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
