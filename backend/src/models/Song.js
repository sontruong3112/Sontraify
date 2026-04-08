import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    genre: { type: String, required: true, trim: true },
    audioUrl: { type: String, required: true, trim: true },
    coverUrl: { type: String, default: "", trim: true },
    duration: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

songSchema.index({ title: "text", artist: "text", genre: "text" });

export const Song = mongoose.model("Song", songSchema);
