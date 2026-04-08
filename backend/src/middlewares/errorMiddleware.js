import { fail } from "../utils/apiResponse.js";

export const notFoundHandler = (req, res) => {
  return fail(res, {
    statusCode: 404,
    message: "Route not found",
    extra: { path: req.originalUrl },
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (res.headersSent) {
    return next(err);
  }

  return fail(res, {
    statusCode,
    message: err.message || "Internal server error",
    extra: {
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
};
