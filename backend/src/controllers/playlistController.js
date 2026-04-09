import { Playlist } from "../models/Playlist.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const withSongAddedAt = (playlist) => {
  const plain = playlist.toObject ? playlist.toObject() : playlist;
  const addedMap = plain.songAddedAt || {};
  const getAddedAt = (songId) => {
    if (!songId) {
      return null;
    }

    if (addedMap instanceof Map) {
      return addedMap.get(songId) || null;
    }

    return addedMap[songId] || null;
  };

  return {
    ...plain,
    songs: (plain.songs || []).map((song) => {
      const songId = song?._id?.toString?.() || song?.toString?.() || "";
      const addedAt = getAddedAt(songId);

      if (song && typeof song === "object") {
        return {
          ...song,
          addedAt: addedAt || null,
        };
      }

      return song;
    }),
  };
};

export const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.create({
    name: req.body.name,
    coverUrl: req.body.coverUrl || "",
    owner: req.user.userId,
    songs: [],
    songAddedAt: {},
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

  return res.status(200).json({ items: items.map((item) => withSongAddedAt(item)) });
});

export const addSongToPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { songId } = req.body;

  const playlist = await Playlist.findOne({ _id: id, owner: req.user.userId });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  if (!playlist.songs.some((song) => song.toString() === songId)) {
    if (!playlist.songAddedAt) {
      playlist.songAddedAt = new Map();
    }

    playlist.songs.push(songId);
    playlist.songAddedAt.set(songId, new Date());
    await playlist.save();
  }

  return res.status(200).json({
    message: "Song added to playlist",
    item: withSongAddedAt(playlist),
  });
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const nextValues = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    nextValues.name = req.body.name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "coverUrl")) {
    nextValues.coverUrl = req.body.coverUrl || "";
  }

  const playlist = await Playlist.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.userId },
    nextValues,
    { new: true, runValidators: true }
  );

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  return res.status(200).json({
    message: "Playlist updated",
    item: withSongAddedAt(playlist),
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

  if (!playlist.songAddedAt) {
    playlist.songAddedAt = new Map();
  }

  playlist.songAddedAt.delete(req.params.songId);
  await playlist.save();

  return res.status(200).json({
    message: "Song removed from playlist",
    item: withSongAddedAt(playlist),
  });
});

export const reorderPlaylistSong = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!playlist) {
    return res.status(404).json({ message: "Playlist not found" });
  }

  const index = Number(req.body.index);
  const direction = Number(req.body.direction);
  const targetIndex = index + direction;

  if (
    index < 0 ||
    targetIndex < 0 ||
    index >= playlist.songs.length ||
    targetIndex >= playlist.songs.length
  ) {
    return res.status(400).json({ message: "Invalid reorder indexes" });
  }

  const nextSongs = [...playlist.songs];
  const temp = nextSongs[index];
  nextSongs[index] = nextSongs[targetIndex];
  nextSongs[targetIndex] = temp;

  playlist.songs = nextSongs;
  await playlist.save();

  return res.status(200).json({
    message: "Playlist reordered",
    item: withSongAddedAt(playlist),
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
