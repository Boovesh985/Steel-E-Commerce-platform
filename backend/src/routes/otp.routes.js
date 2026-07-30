/**
 * OTP routes — check-availability only.
 * Phone OTP send/verify is now handled by Firebase Phone Auth on the frontend.
 * The backend only verifies the Firebase ID token during registration/profile update.
 */
const { Router } = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyAccessToken } = require('../services/auth.service');
const ctrl = require('../controllers/otp.controller');

const router = Router();

// Rate limit all OTP routes
router.use(authLimiter);

/**
 * Optional auth middleware — sets req.user if a valid token is present,
 * but does NOT reject the request if no token is provided.
 */
function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyAccessToken(token);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      }
    }
  } catch {
    // Token invalid/expired — treat as unauthenticated, don't block the request
  }
  next();
}

router.use(optionalAuth);

// Only check-availability remains — send/verify/resend handled by Firebase
router.post('/check-availability', ctrl.checkAvailability);

module.exports = router;
