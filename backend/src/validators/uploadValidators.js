import { body } from "express-validator";

export const uploadSignatureValidator = [
  body("resourceType")
    .optional()
    .isIn(["image", "video"])
    .withMessage("resourceType must be image or video"),
  body("folder")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("folder must be a non-empty string up to 120 chars"),
];
