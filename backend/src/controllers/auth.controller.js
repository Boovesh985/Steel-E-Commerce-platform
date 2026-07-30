/**
 * Auth controller — register, login, refresh, logout, forgot/reset password.
 */
const { authPrisma } = require('../config/database');
const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const { verifyFirebaseToken } = require('../config/firebase-admin');
const { AppError } = require('../middleware/errorHandler');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, phone, password, gstin, phoneVerificationToken } = req.body;

    // Verify phone number via Firebase Phone Auth token
    let isPhoneVerified = false;
    if (phoneVerificationToken) {
      try {
        const { phone: verifiedPhone } = await otpService.verifyPhoneToken(phoneVerificationToken);
        if (verifiedPhone === phone) {
          isPhoneVerified = true;
        } else {
          throw new AppError(400, 'PHONE_MISMATCH', 'The verified phone number does not match.');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(400, 'PHONE_VERIFICATION_FAILED', 'Phone verification token is invalid or expired. Please verify again.');
      }
    }

    // Check existing user
    const existing = await authPrisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'phone';
      throw new AppError(409, 'DUPLICATE_ENTRY', `A user with this ${field} already exists.`);
    }

    const passwordHash = await authService.hashPassword(password);

    const user = await authPrisma.user.create({
      data: { name, email, phone, passwordHash, role: 'CUSTOMER', gstin, phoneVerified: isPhoneVerified },
      select: { id: true, name: true, email: true, phone: true, role: true, gstin: true, phoneVerified: true, googleId: true, avatarUrl: true, createdAt: true },
    });
    const userResponse = { ...user, hasPassword: true };

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Store refresh token hash
    await authPrisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: authService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      success: true,
      data: { user: userResponse, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await authPrisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
    }

    // If user has no password (e.g. Google-only account), guide them
    if (!user.passwordHash) {
      throw new AppError(401, 'NO_PASSWORD', 'This account was created with Google. Please sign in with Google, then set a password in your profile settings.');
    }

    const { valid, needsRehash } = await authService.comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Auto-upgrade legacy bcrypt hash to Argon2id on successful login
    if (needsRehash) {
      const newHash = await authService.hashPassword(password);
      await authPrisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    }

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Store refresh token hash
    await authPrisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: authService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash: _, ...userData } = user;

    res.json({
      success: true,
      data: { user: { ...userData, hasPassword: !!_ }, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token is required.');
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = authService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token.');
    }

    // Check refresh token hash in DB
    const tokenHash = authService.hashToken(refreshToken);
    const storedToken = await authPrisma.refreshToken.findFirst({
      where: { userId: decoded.id, tokenHash },
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token has expired or been revoked.');
    }

    // Fetch user
    const user = await authPrisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or disabled.');
    }

    const newAccessToken = authService.generateAccessToken(user);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = authService.hashToken(refreshToken);
      await authPrisma.refreshToken.deleteMany({
        where: { userId: req.user.id, tokenHash },
      });
    }

    res.json({ success: true, data: { message: 'Logged out successfully.' } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const user = await authPrisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        data: { message: 'If that email exists, a reset link has been sent.' },
      });
    }

    const { token, hash, expiresAt } = authService.generateResetToken();

    // Store reset token as a special refresh token with prefix
    await authPrisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: `reset:${hash}`,
        expiresAt,
      },
    });

    // Send real email if Resend API key is configured, otherwise log to console
    const env = require('../config/env');
    if (env.RESEND_API_KEY) {
      const { sendPasswordResetEmail } = require('../services/email.service');
      await sendPasswordResetEmail({
        to: email,
        resetToken: token,
        userName: user.name,
      });
    } else {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
      console.log(`🔑 Password reset token for ${email}: ${token}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log(`⚠️  Set RESEND_API_KEY in .env to send real emails.`);
    }

    res.json({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    const storedToken = await authPrisma.refreshToken.findFirst({
      where: { tokenHash: `reset:${hash}` },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or has expired.');
    }

    const passwordHash = await authService.hashPassword(password);

    await authPrisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash },
    });

    // Delete the used reset token
    await authPrisma.refreshToken.delete({ where: { id: storedToken.id } });

    res.json({ success: true, data: { message: 'Password has been reset successfully.' } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google
async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;

    // Verify Firebase ID token
    const decoded = await verifyFirebaseToken(idToken);
    const { email, name, picture, uid } = decoded;

    if (!email) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Google account must have an email address.');
    }

    // Find existing user by email or googleId
    let user = await authPrisma.user.findFirst({
      where: { OR: [{ email }, { googleId: uid }] },
    });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await authPrisma.user.update({
          where: { id: user.id },
          data: { googleId: uid, avatarUrl: picture || user.avatarUrl, emailVerified: true },
        });
      }
      if (!user.isActive) {
        throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
      }
    } else {
      // Create new user from Google profile
      user = await authPrisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          googleId: uid,
          avatarUrl: picture || null,
          emailVerified: true,
          role: 'CUSTOMER',
        },
      });
    }

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    await authPrisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: authService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash: _, ...userData } = user;

    res.json({
      success: true,
      data: { user: { ...userData, hasPassword: !!_ }, accessToken, refreshToken },
    });
  } catch (err) {
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return next(new AppError(401, 'INVALID_TOKEN', 'Firebase token is invalid or expired.'));
    }
    next(err);
  }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, googleAuth };
