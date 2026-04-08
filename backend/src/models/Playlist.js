import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1, name: 1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);
