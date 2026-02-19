import { logger } from "../utils/logger.js";

/**
 * 404 handler — catches unmatched routes.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Global error handler middleware.
 */
export function errorHandler(err, _req, res, _next) {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.name || "InternalServerError",
    message: err.message || "Something went wrong",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
