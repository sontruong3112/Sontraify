import { body, param } from "express-validator";

export const createPlaylistValidator = [
  body("name").trim().notEmpty().withMessage("Playlist name is required"),
];

export const objectIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid id"),
];

export const addSongValidator = [
  param("id").isMongoId().withMessage("Invalid playlist id"),
  body("songId").isMongoId().withMessage("songId must be a valid MongoDB ObjectId"),
];

export const updatePlaylistValidator = [
  param("id").isMongoId().withMessage("Invalid playlist id"),
  body("name").trim().notEmpty().withMessage("Playlist name is required"),
];

export const removeSongValidator = [
  param("id").isMongoId().withMessage("Invalid playlist id"),
  param("songId").isMongoId().withMessage("Invalid song id"),
];
