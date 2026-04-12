import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const loginValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const logoutValidator = [
  body("refreshToken")
    .optional()
    .isString()
    .withMessage("refreshToken must be a string"),
];

export const preferenceActionValidator = [
  body("action").isString().notEmpty().withMessage("action is required"),
  body("songId").optional().isString().withMessage("songId must be a string"),
  body("index").optional().isInt().withMessage("index must be an integer"),
  body("direction").optional().isInt().withMessage("direction must be an integer"),
];

export const googleAuthValidator = [
  body("accessToken")
    .isString()
    .notEmpty()
    .withMessage("accessToken is required"),
];

export const clerkAuthValidator = [
  body("token")
    .isString()
    .notEmpty()
    .withMessage("token is required"),
];

export const updateMeValidator = [
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage("name must be between 1 and 80 characters"),
  body("avatarUrl")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("avatarUrl must be at most 500 characters"),
];
