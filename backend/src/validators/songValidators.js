import { body, param, query } from "express-validator";

export const createSongValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("artist").trim().notEmpty().withMessage("Artist is required"),
  body("genre").trim().notEmpty().withMessage("Genre is required"),
  body("audioUrl").trim().notEmpty().withMessage("Audio URL is required"),
  body("duration").optional().isFloat({ min: 0 }).withMessage("Duration must be >= 0"),
];

export const songQueryValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1-100"),
];

export const songIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid song id"),
];

export const updateSongValidator = [
  ...songIdParamValidator,
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("artist").optional().trim().notEmpty().withMessage("Artist cannot be empty"),
  body("genre").optional().trim().notEmpty().withMessage("Genre cannot be empty"),
  body("audioUrl").optional().trim().notEmpty().withMessage("Audio URL cannot be empty"),
  body("coverUrl").optional().isString().withMessage("coverUrl must be a string"),
  body("duration").optional().isFloat({ min: 0 }).withMessage("Duration must be >= 0"),
];
