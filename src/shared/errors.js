class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: err.message || "Internal server error",
  };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== "production" && status === 500) {
    payload.stack = err.stack;
  }
  if (status >= 500) console.error(err);
  res.status(status).json(payload);
}

module.exports = { AppError, notFound, errorHandler };
