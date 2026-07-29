/**
 * Global error handler middleware.
 * Catches all errors thrown or passed via next(err) and returns a consistent JSON response.
 */
function errorHandler(err, req, res, _next) {
  // Log errors — only show full stack for genuine server errors (5xx)
  const errStatus = err.statusCode || err.status || 500;
  if (errStatus >= 500) {
    console.error('❌ Error:', err);
  } else if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠ ${errStatus} ${err.errorCode || err.name || ''}: ${err.message} [${req.method} ${req.originalUrl}]`);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: `A record with this ${field} already exists.` },
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested record was not found.' },
    });
  }

  // Zod validation errors (supports both Zod v3 .errors and v4 .issues)
  if (err.name === 'ZodError') {
    const zodIssues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data.',
        details: Array.isArray(zodIssues)
          ? zodIssues.map((e) => ({ path: (e.path || []).join('.'), message: e.message }))
          : [],
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or malformed token.' },
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token has expired.' },
    });
  }

  // Custom application errors
  const status = err.statusCode || err.status || 500;
  const code = err.errorCode || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Helper to create application errors with status codes.
 */
class AppError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, AppError };
