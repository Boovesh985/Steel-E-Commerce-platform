/**
 * OTP routes — send, verify, resend, check-availability.
 *
 * These routes use optionalAuth: if a valid token is present, req.user is set,
 * but the route still works for unauthenticated callers (e.g. during registration).
 * This enables safeExcludeUserId() in the controller to trust excludeUserId
 * only when authenticated.
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

router.post('/send', ctrl.sendOtp);
router.post('/verify', ctrl.verifyOtp);
router.post('/resend', ctrl.resendOtp);
router.post('/check-availability', ctrl.checkAvailability);

module.exports = router;
