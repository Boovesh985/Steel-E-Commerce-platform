/**
 * Auth routes.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyRecaptcha } = require('../middleware/recaptcha');
const {
  registerSchema, loginSchema, googleAuthSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema,
} = require('../schemas/auth.schema');
const ctrl = require('../controllers/auth.controller');

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

router.post('/register', verifyRecaptcha('register'), validate(registerSchema), ctrl.register);
router.post('/login', verifyRecaptcha('login'), validate(loginSchema), ctrl.login);
router.post('/google', verifyRecaptcha('google_auth'), validate(googleAuthSchema), ctrl.googleAuth);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);
router.post('/forgot-password', verifyRecaptcha('forgot_password'), validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);

module.exports = router;
