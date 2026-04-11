import mongoose from "mongoose";
import { Artist } from "../models/Artist.js";
import { Song } from "../models/Song.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const buildSlug = (value = "") => {
  const base = String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return base || `artist-${Date.now()}`;
};

const getUniqueSlug = async (name) => {
  const base = buildSlug(name);
  let candidate = base;
  let suffix = 1;

  while (await Artist.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const normalizeAlbumPayload = (album = {}) => ({
  id: String(album._id || ""),
  title: album.title || "",
  coverUrl: album.coverUrl || "",
  description: album.description || "",
  releaseDate: album.releaseDate || null,
  songs: Array.isArray(album.songIds)
    ? album.songIds
        .map((song) => {
          if (!song || !song._id) {
            return null;
          }

          return {
            _id: String(song._id),
            title: song.title || "",
            artist: song.artist || "",
            genre: song.genre || "",
            audioUrl: song.audioUrl || "",
            coverUrl: song.coverUrl || "",
            duration: Number(song.duration) || 0,
            createdAt: song.createdAt || null,
          };
        })
        .filter(Boolean)
    : [],
});

const normalizeArtistPayload = (artist) => ({
  id: String(artist._id || ""),
  name: artist.name || "",
  slug: artist.slug || "",
  bio: artist.bio || "",
  avatarUrl: artist.avatarUrl || "",
  bannerUrl: artist.bannerUrl || "",
  albums: Array.isArray(artist.albums)
    ? artist.albums.map((album) => normalizeAlbumPayload(album))
    : [],
  createdAt: artist.createdAt || null,
  updatedAt: artist.updatedAt || null,
});

const findArtistByIdOrSlug = async (idOrSlug = "") => {
  const value = String(idOrSlug || "").trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Artist.findById(value).populate("albums.songIds");
    if (byId) {
      return byId;
    }
  }

  return Artist.findOne({ slug: value }).populate("albums.songIds");
};

export const listArtists = asyncHandler(async (_req, res) => {
  const artists = await Artist.find()
    .sort({ updatedAt: -1 })
    .populate({ path: "albums.songIds", select: "title artist coverUrl duration genre audioUrl createdAt" });

  return res.status(200).json({
    artists: artists.map((artist) => normalizeArtistPayload(artist)),
  });
});

export const getArtistDetail = asyncHandler(async (req, res) => {
  const artist = await findArtistByIdOrSlug(req.params.idOrSlug);

  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  return res.status(200).json({
    artist: normalizeArtistPayload(artist),
  });
});

export const createArtist = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();

  const slug = await getUniqueSlug(name);
  const artist = await Artist.create({
    name,
    slug,
    bio: String(req.body.bio || "").trim(),
    avatarUrl: String(req.body.avatarUrl || "").trim(),
    bannerUrl: String(req.body.bannerUrl || "").trim(),
    albums: [],
  });

  return res.status(201).json({
    message: "Artist created",
    artist: normalizeArtistPayload(artist),
  });
});

export const createArtistAlbum = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.artistId);

  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  artist.albums.push({
    title: String(req.body.title || "").trim(),
    coverUrl: String(req.body.coverUrl || "").trim(),
    description: String(req.body.description || "").trim(),
    releaseDate: req.body.releaseDate ? new Date(req.body.releaseDate) : undefined,
    songIds: [],
  });

  await artist.save();
  await artist.populate({ path: "albums.songIds", select: "title artist coverUrl duration genre audioUrl createdAt" });

  return res.status(201).json({
    message: "Album created",
    artist: normalizeArtistPayload(artist),
  });
});

export const addSongToArtistAlbum = asyncHandler(async (req, res) => {
  const { artistId, albumId } = req.params;
  const { songId } = req.body;

  const [artist, song] = await Promise.all([
    Artist.findById(artistId),
    Song.findById(songId),
  ]);

  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  const album = artist.albums.id(albumId);
  if (!album) {
    return res.status(404).json({ message: "Album not found" });
  }

  const alreadyExists = album.songIds.some((value) => String(value) === String(song._id));
  if (!alreadyExists) {
    album.songIds.push(song._id);
  }

  await artist.save();
  await artist.populate({ path: "albums.songIds", select: "title artist coverUrl duration genre audioUrl createdAt" });

  return res.status(200).json({
    message: alreadyExists ? "Song already in album" : "Song added to album",
    artist: normalizeArtistPayload(artist),
  });
});
