import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    coverUrl: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    releaseDate: { type: Date },
    songIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  },
  { _id: true, timestamps: true }
);

const artistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    bio: { type: String, default: "", trim: true },
    avatarUrl: { type: String, default: "", trim: true },
    bannerUrl: { type: String, default: "", trim: true },
    albums: [albumSchema],
  },
  { timestamps: true }
);

artistSchema.index({ name: "text", slug: 1 });
artistSchema.index({ slug: 1 }, { unique: true });

export const Artist = mongoose.model("Artist", artistSchema);
