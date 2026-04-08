export const ok = (res, {
  statusCode = 200,
  message = "Success",
  data = {},
  meta,
  extra = {},
} = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
    ...extra,
  });
};

export const fail = (res, {
  statusCode = 400,
  message = "Request failed",
  errors,
  extra = {},
} = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...extra,
  });
};
