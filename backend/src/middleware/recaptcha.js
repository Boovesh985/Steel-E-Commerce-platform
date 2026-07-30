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
    // Skip if not configured
    if (!env.RECAPTCHA_SECRET_KEY) {
      return next();
    }

    const token = req.body.recaptchaToken || req.headers['x-recaptcha-token'];
    if (!token) {
      // Fail open — don't block users if frontend didn't send a token
      console.warn('⚠️ reCAPTCHA token missing — allowing request (fail-open)');
      return next();
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
        // Fail open — log but don't block (reCAPTCHA key may not be configured for this domain)
        return next();
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
      // Fail open — don't block on network/verification errors
      next();
    }
  };
}

module.exports = { verifyRecaptcha };
