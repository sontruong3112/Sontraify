import express from "express";
import {
	createSong,
	deleteSong,
	getSongById,
	listSongs,
	updateSong,
} from "../controllers/songController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
	createSongValidator,
	songIdParamValidator,
	songQueryValidator,
	updateSongValidator,
} from "../validators/songValidators.js";

const router = express.Router();

router.get("/", songQueryValidator, validateRequest, listSongs);
router.get("/:id", songIdParamValidator, validateRequest, getSongById);
router.post(
	"/",
	requireAuth,
	requireRole("admin"),
	createSongValidator,
	validateRequest,
	createSong
);
router.put(
	"/:id",
	requireAuth,
	requireRole("admin"),
	updateSongValidator,
	validateRequest,
	updateSong
);
router.delete(
	"/:id",
	requireAuth,
	requireRole("admin"),
	songIdParamValidator,
	validateRequest,
	deleteSong
);

export default router;
