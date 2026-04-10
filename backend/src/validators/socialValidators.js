import { body, param, query } from "express-validator";

export const searchUsersValidator = [
  query("q")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage("q must be at most 120 characters"),
];

export const friendRequestValidator = [
  body("userId").isString().notEmpty().withMessage("userId is required"),
];

export const friendActionValidator = [
  param("userId").isString().notEmpty().withMessage("userId is required"),
  body("action")
    .isIn(["accept", "decline"])
    .withMessage("action must be accept or decline"),
];

export const conversationParamValidator = [
  param("friendId").isString().notEmpty().withMessage("friendId is required"),
];

export const listMessagesValidator = [
  ...conversationParamValidator,
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("before")
    .optional()
    .isISO8601()
    .withMessage("before must be a valid ISO date"),
];

export const sendMessageValidator = [
  ...conversationParamValidator,
  body("text")
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("text must be between 1 and 1000 characters"),
];
