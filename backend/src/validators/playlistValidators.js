import { body, param } from "express-validator";

export const createPlaylistValidator = [
  body("name").trim().notEmpty().withMessage("Playlist name is required"),
  body("coverUrl")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage("coverUrl must be a string"),
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
  body().custom((_, { req }) => {
    const hasName = Object.prototype.hasOwnProperty.call(req.body, "name");
    const hasCoverUrl = Object.prototype.hasOwnProperty.call(req.body, "coverUrl");

    if (!hasName && !hasCoverUrl) {
      throw new Error("At least one field is required");
    }

    return true;
  }),
  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Playlist name is required"),
  body("coverUrl")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage("coverUrl must be a string"),
];

export const removeSongValidator = [
  param("id").isMongoId().withMessage("Invalid playlist id"),
  param("songId").isMongoId().withMessage("Invalid song id"),
];

export const reorderSongsValidator = [
  param("id").isMongoId().withMessage("Invalid playlist id"),
  body("index").isInt({ min: 0 }).withMessage("index must be a non-negative integer"),
  body("direction")
    .isInt()
    .custom((value) => Number(value) === -1 || Number(value) === 1)
    .withMessage("direction must be -1 or 1"),
];
