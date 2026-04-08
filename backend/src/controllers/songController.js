import { Song } from "../models/Song.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listSongs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const keyword = (req.query.q || "").trim();
  const genre = (req.query.genre || "").trim();

  const query = {};

  if (keyword) {
    query.$text = { $search: keyword };
  }

  if (genre) {
    query.genre = genre;
  }

  const [items, total] = await Promise.all([
    Song.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Song.countDocuments(query),
  ]);

  return res.status(200).json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const createSong = asyncHandler(async (req, res) => {
  const song = await Song.create(req.body);

  return res.status(201).json({
    message: "Song created",
    item: song,
  });
});

export const getSongById = asyncHandler(async (req, res) => {
  const song = await Song.findById(req.params.id);

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  return res.status(200).json({ item: song });
});

export const updateSong = asyncHandler(async (req, res) => {
  const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  return res.status(200).json({
    message: "Song updated",
    item: song,
  });
});

export const deleteSong = asyncHandler(async (req, res) => {
  const song = await Song.findByIdAndDelete(req.params.id);

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  return res.status(200).json({ message: "Song deleted" });
});
