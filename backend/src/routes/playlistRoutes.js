import express from "express";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  listMyPlaylists,
  removeSongFromPlaylist,
  updatePlaylist,
} from "../controllers/playlistController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addSongValidator,
  createPlaylistValidator,
  objectIdParamValidator,
  removeSongValidator,
  updatePlaylistValidator,
} from "../validators/playlistValidators.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listMyPlaylists);
router.post("/", createPlaylistValidator, validateRequest, createPlaylist);
router.post("/:id/songs", addSongValidator, validateRequest, addSongToPlaylist);
router.patch("/:id", updatePlaylistValidator, validateRequest, updatePlaylist);
router.delete("/:id", objectIdParamValidator, validateRequest, deletePlaylist);
router.delete(
  "/:id/songs/:songId",
  removeSongValidator,
  validateRequest,
  removeSongFromPlaylist
);

export default router;
