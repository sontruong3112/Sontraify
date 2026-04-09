import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    coverUrl: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    songAddedAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1, name: 1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);
