/**
 * OTP Service — generates, stores, and verifies OTPs.
 * Sends OTP via Fast2SMS API for Indian mobile numbers.
 *
 * In dev mode without FAST2SMS_API_KEY, logs OTP to console.
 */
const crypto = require('crypto');
const env = require('../config/env');

// ── In-memory OTP store ──────────────────────────────────────────────────
// Map<phone, { hash, expiresAt, attempts, lastSentAt }>
//
// ⚠️  PRODUCTION LIMITATION: This in-memory store has two issues:
//   1. OTPs are LOST on server restart/crash — users mid-verification will fail.
//   2. NOT cluster-safe — each Node.js process has its own store.
//
// For production, migrate to Redis (SET with TTL) or store in the auth database:
//   CREATE TABLE otp_store (phone VARCHAR(10) PRIMARY KEY, hash TEXT, expires_at TIMESTAMPTZ, ...);
const otpStore = new Map();

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;       // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;       // 30 seconds
const PHONE_VERIFY_TOKEN_EXPIRY = '15m';

/**
 * Generate a cryptographically random numeric OTP.
 */
function generateOtp() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Hash an OTP for secure storage.
 */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Send OTP via Fast2SMS API.
 * Falls back to console logging if API key is not configured.
 */
async function sendViaSms(phone, otp) {
  if (!env.FAST2SMS_API_KEY) {
    console.log(`📱 [DEV] OTP for ${phone}: ${otp}`);
    console.log(`⚠️  Set FAST2SMS_API_KEY in .env to send real SMS.`);
    return { success: true, dev: true };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone,
        flash: 0,
      }),
    });

    const data = await response.json();

    if (!data.return) {
      console.error('Fast2SMS error:', data);
      // Fall back to console logging so users aren't blocked
      console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp}`);
      console.log(`⚠️  Fast2SMS API returned error — OTP logged to server console.`);
      console.log(`   Fix: Complete website verification at https://www.fast2sms.com → OTP Message menu.`);
      return { success: true, dev: true };
    }

    console.log(`✅ OTP sent to ${phone} via Fast2SMS (request: ${data.request_id})`);
    return { success: true, requestId: data.request_id };
  } catch (err) {
    // Fall back gracefully on network/API errors
    console.error('Fast2SMS request failed:', err.message);
    console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp}`);
    return { success: true, dev: true };
  }
}

/**
 * Send OTP to a phone number.
 * Returns { success, message, dev? }
 */
async function sendOtp(phone) {
  const existing = otpStore.get(phone);

  // Rate limit check
  if (existing && existing.lastSentAt) {
    const elapsed = Date.now() - existing.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        code: 'COOLDOWN',
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      };
    }
  }

  const otp = generateOtp();
  const hash = hashOtp(otp);

  // Store OTP
  otpStore.set(phone, {
    hash,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  // Auto-cleanup after expiry
  setTimeout(() => {
    const stored = otpStore.get(phone);
    if (stored && stored.hash === hash) {
      otpStore.delete(phone);
    }
  }, OTP_EXPIRY_MS + 1000);

  // Send SMS
  const result = await sendViaSms(phone, otp);

  return {
    success: true,
    message: `OTP sent to +91${phone}.`,
    dev: result.dev || false,
  };
}

/**
 * Verify an OTP for a phone number.
 * Returns { success, message, token? }
 */
function verifyOtp(phone, otp) {
  const stored = otpStore.get(phone);

  if (!stored) {
    return { success: false, code: 'NOT_FOUND', message: 'No OTP found. Please request a new one.' };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return { success: false, code: 'EXPIRED', message: 'OTP has expired. Please request a new one.' };
  }

  if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(phone);
    return { success: false, code: 'MAX_ATTEMPTS', message: 'Too many failed attempts. Please request a new OTP.' };
  }

  stored.attempts += 1;

  const inputHash = hashOtp(otp);
  if (inputHash !== stored.hash) {
    return {
      success: false,
      code: 'INVALID',
      message: `Invalid OTP. ${MAX_VERIFY_ATTEMPTS - stored.attempts} attempts remaining.`,
    };
  }

  // OTP verified — clean up
  otpStore.delete(phone);

  // Generate a signed phone verification token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { phone, verified: true, type: 'phone_verification' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: PHONE_VERIFY_TOKEN_EXPIRY }
  );

  return {
    success: true,
    message: 'Phone number verified successfully.',
    token,
  };
}

/**
 * Verify a phone verification token (used during registration).
 * Returns { phone } if valid, throws if invalid.
 */
function verifyPhoneToken(token) {
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (decoded.type !== 'phone_verification' || !decoded.verified) {
    throw new Error('Invalid phone verification token.');
  }

  return { phone: decoded.phone };
}

module.exports = { sendOtp, verifyOtp, verifyPhoneToken };
