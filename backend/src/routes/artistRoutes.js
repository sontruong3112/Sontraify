import express from "express";
import {
  addSongToArtistAlbum,
  createArtist,
  createArtistAlbum,
  getArtistDetail,
  listArtists,
} from "../controllers/artistController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addSongToAlbumValidator,
  artistIdOrSlugValidator,
  createAlbumValidator,
  createArtistValidator,
} from "../validators/artistValidators.js";

const router = express.Router();

router.get("/", listArtists);
router.get("/:idOrSlug", artistIdOrSlugValidator, validateRequest, getArtistDetail);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  createArtistValidator,
  validateRequest,
  createArtist
);

router.post(
  "/:artistId/albums",
  requireAuth,
  requireRole("admin"),
  createAlbumValidator,
  validateRequest,
  createArtistAlbum
);

router.post(
  "/:artistId/albums/:albumId/songs",
  requireAuth,
  requireRole("admin"),
  addSongToAlbumValidator,
  validateRequest,
  addSongToArtistAlbum
);

export default router;
