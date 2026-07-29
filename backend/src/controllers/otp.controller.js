/**
 * OTP controller — send, verify, and resend OTP.
 *
 * Security: excludeUserId is only honored when it matches the authenticated
 * user's ID (via optional auth). Unauthenticated callers cannot bypass the
 * phone-uniqueness check for arbitrary user IDs.
 */
const otpService = require('../services/otp.service');
const { AppError } = require('../middleware/errorHandler');
const { authPrisma } = require('../config/database');

const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Safely resolve excludeUserId — only trust it if:
 *   - The request is authenticated (req.user exists), AND
 *   - The supplied excludeUserId matches the authenticated user's ID.
 * This prevents unauthenticated callers from passing an arbitrary userId
 * to bypass the duplicate-phone check.
 */
function safeExcludeUserId(req) {
  const { excludeUserId } = req.body || {};
  if (excludeUserId && req.user && excludeUserId === req.user.id) {
    return excludeUserId;
  }
  return undefined;
}

// POST /api/otp/send
async function sendOtp(req, res, next) {
  try {
    const { phone } = req.body;
    const excludeUserId = safeExcludeUserId(req);

    if (!phone || !PHONE_REGEX.test(phone)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid 10-digit Indian phone number is required.');
    }

    // Check if phone is already registered to another user
    const existing = await authPrisma.user.findFirst({
      where: {
        phone,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'PHONE_IN_USE', 'This phone number is already registered to another account.');
    }

    const result = await otpService.sendOtp(phone);

    if (!result.success) {
      return res.status(429).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    res.json({
      success: true,
      data: { message: result.message, dev: result.dev },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/otp/verify
async function verifyOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;

    if (!phone || !PHONE_REGEX.test(phone)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid 10-digit Indian phone number is required.');
    }

    if (!otp || otp.length !== 6) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A 6-digit OTP is required.');
    }

    const result = otpService.verifyOtp(phone, otp);

    if (!result.success) {
      const statusCode = result.code === 'MAX_ATTEMPTS' ? 429 : 400;
      return res.status(statusCode).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    res.json({
      success: true,
      data: { message: result.message, phoneVerificationToken: result.token },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/otp/resend
async function resendOtp(req, res, next) {
  try {
    const { phone } = req.body;
    const excludeUserId = safeExcludeUserId(req);

    if (!phone || !PHONE_REGEX.test(phone)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid 10-digit Indian phone number is required.');
    }

    // Check if phone is already registered to another user
    const existing = await authPrisma.user.findFirst({
      where: {
        phone,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'PHONE_IN_USE', 'This phone number is already registered to another account.');
    }

    const result = await otpService.sendOtp(phone);

    if (!result.success) {
      return res.status(429).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    res.json({
      success: true,
      data: { message: result.message, dev: result.dev },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/otp/check-availability — check if email/phone is already in use
// Note: this endpoint can reveal whether an email/phone is registered.
// It's restricted so that excludeUserId only works for the authenticated user.
async function checkAvailability(req, res, next) {
  try {
    const { email, phone } = req.body;
    const excludeUserId = safeExcludeUserId(req);
    const result = {};

    if (email) {
      const existing = await authPrisma.user.findFirst({
        where: {
          email,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
      });
      result.emailAvailable = !existing;
    }

    if (phone && PHONE_REGEX.test(phone)) {
      const existing = await authPrisma.user.findFirst({
        where: {
          phone,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
      });
      result.phoneAvailable = !existing;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendOtp, verifyOtp, resendOtp, checkAvailability };
