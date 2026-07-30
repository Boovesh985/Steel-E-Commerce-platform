/**
 * OTP controller — check-availability only.
 * Phone OTP send/verify is now handled by Firebase Phone Auth on the frontend.
 */
const { AppError } = require('../middleware/errorHandler');
const { authPrisma } = require('../config/database');

const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Safely resolve excludeUserId — only trust it if:
 *   - The request is authenticated (req.user exists), AND
 *   - The supplied excludeUserId matches the authenticated user's ID.
 */
function safeExcludeUserId(req) {
  const { excludeUserId } = req.body || {};
  if (excludeUserId && req.user && excludeUserId === req.user.id) {
    return excludeUserId;
  }
  return undefined;
}

// POST /api/otp/check-availability — check if email/phone is already in use
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

module.exports = { checkAvailability };
