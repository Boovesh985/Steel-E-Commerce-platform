/**
 * reCAPTCHA v3 verification middleware.
 * Validates the reCAPTCHA token sent by the frontend against Google's API.
 * Skips verification if RECAPTCHA_SECRET_KEY is not configured (dev mode).
 */
const env = require('../config/env');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

function verifyRecaptcha(action) {
  return async (req, res, next) => {
    // Skip in dev if not configured
    if (!env.RECAPTCHA_SECRET_KEY) {
      return next();
    }

    // Skip for native mobile apps — reCAPTCHA v3 can't run in Capacitor WebViews.
    // Rate limiting still protects these endpoints from abuse.
    if (req.headers['x-app-platform'] === 'capacitor') {
      return next();
    }

    const token = req.body.recaptchaToken || req.headers['x-recaptcha-token'];
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'RECAPTCHA_MISSING', message: 'reCAPTCHA verification is required.' },
      });
    }

    try {
      const response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.RECAPTCHA_SECRET_KEY,
          response: token,
        }),
      });

      const data = await response.json();

      if (!data.success || data.score < MIN_SCORE) {
        console.warn(`🤖 reCAPTCHA failed: score=${data.score}, action=${data.action}, errors=${data['error-codes']}`);
        return res.status(403).json({
          success: false,
          error: { code: 'RECAPTCHA_FAILED', message: 'reCAPTCHA verification failed. Please try again.' },
        });
      }

      // Optionally verify the action matches
      if (action && data.action !== action) {
        console.warn(`🤖 reCAPTCHA action mismatch: expected=${action}, got=${data.action}`);
      }

      // Attach score to request for logging
      req.recaptchaScore = data.score;
      next();
    } catch (err) {
      console.error('reCAPTCHA verification error:', err.message);
      // Don't block the request on network errors — fail open in dev
      if (env.NODE_ENV === 'development') return next();
      return res.status(500).json({
        success: false,
        error: { code: 'RECAPTCHA_ERROR', message: 'Could not verify reCAPTCHA.' },
      });
    }
  };
}

module.exports = { verifyRecaptcha };
