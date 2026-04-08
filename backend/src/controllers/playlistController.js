import { Playlist } from "../models/Playlist.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.create({
    name: req.body.name,
    owner: req.user.userId,
    songs: [],
  });

  return res.status(201).json({
    message: "Playlist created",
    item: playlist,
  });
});

export const listMyPlaylists = asyncHandler(async (req, res) => {
  const items = await Playlist.find({ owner: req.user.userId })
    .populate("songs")
    .sort({ createdAt: -1 });

  return res.status(200).json({ items });
});

export const addSongToPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { songId } = req.body;

  const playlist = await Playlist.findOne({ _id: id, owner: req.user.userId });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  if (!playlist.songs.some((song) => song.toString() === songId)) {
    playlist.songs.push(songId);
    await playlist.save();
  }

  return res.status(200).json({
    message: "Song added to playlist",
    item: playlist,
  });
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.userId },
    { name: req.body.name },
    { new: true, runValidators: true }
  );

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  return res.status(200).json({
    message: "Playlist updated",
    item: playlist,
  });
});

export const removeSongFromPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  playlist.songs = playlist.songs.filter(
    (song) => song.toString() !== req.params.songId
  );
  await playlist.save();

  return res.status(200).json({
    message: "Song removed from playlist",
    item: playlist,
  });
});

export const deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  return res.status(200).json({ message: "Playlist deleted" });
});
