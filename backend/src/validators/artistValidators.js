import { body, param } from "express-validator";

export const createArtistValidator = [
  body("name").trim().notEmpty().withMessage("Artist name is required"),
  body("bio").optional().isString().withMessage("bio must be a string"),
  body("avatarUrl").optional().isString().withMessage("avatarUrl must be a string"),
  body("bannerUrl").optional().isString().withMessage("bannerUrl must be a string"),
];

export const artistIdOrSlugValidator = [
  param("idOrSlug").trim().notEmpty().withMessage("Artist id or slug is required"),
];

export const artistIdValidator = [
  param("artistId").isMongoId().withMessage("Invalid artist id"),
];

export const createAlbumValidator = [
  ...artistIdValidator,
  body("title").trim().notEmpty().withMessage("Album title is required"),
  body("coverUrl").optional().isString().withMessage("coverUrl must be a string"),
  body("description").optional().isString().withMessage("description must be a string"),
  body("releaseDate").optional().isISO8601().withMessage("releaseDate must be valid ISO date"),
];

export const addSongToAlbumValidator = [
  ...artistIdValidator,
  param("albumId").isMongoId().withMessage("Invalid album id"),
  body("songId").isMongoId().withMessage("Invalid song id"),
];
