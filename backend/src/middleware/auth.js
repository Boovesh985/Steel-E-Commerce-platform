/**
 * Auth middleware — requireAuth and requireAdmin.
 * Extracts JWT from Authorization: Bearer header (NOT cookies).
 */
const { verifyAccessToken } = require('../services/auth.service');
const { AppError } = require('./errorHandler');

/**
 * Requires a valid access token in the Authorization header.
 * Attaches decoded user to req.user = { id, email, role }
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is required.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is required.');
    }

    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'AppError') return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired.'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid access token.'));
  }
}

/**
 * Requires the authenticated user to have ADMIN role.
 * Must be used AFTER requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access required.'));
  }
  next();
}

/**
 * Requires ADMIN or STAFF role.
 */
function requireStaff(req, res, next) {
  if (!req.user || !['ADMIN', 'STAFF'].includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'Staff or admin access required.'));
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireStaff };
