import { validationResult } from "express-validator";
import { fail } from "../utils/apiResponse.js";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return fail(res, {
      statusCode: 400,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};
