/**
 * User controller — profile and address management.
 */
const { authPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/users/me
async function getProfile(req, res, next) {
  try {
    const user = await authPrisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        gstin: true, isActive: true, emailVerified: true, phoneVerified: true,
        googleId: true, avatarUrl: true, passwordHash: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
    // Don't send the actual hash — just a boolean flag
    const { passwordHash, ...userData } = user;
    res.json({ success: true, data: { ...userData, hasPassword: !!passwordHash } });
  } catch (err) { next(err); }
}

// PUT /api/users/me
async function updateProfile(req, res, next) {
  try {
    const { name, phone, gstin, phoneVerificationToken } = req.body;
    const otpService = require('../services/otp.service');

    // Check phone uniqueness if changing
    if (phone) {
      const existing = await authPrisma.user.findFirst({
        where: { phone, id: { not: req.user.id } },
      });
      if (existing) throw new AppError(409, 'DUPLICATE_ENTRY', 'This phone number is already in use.');
    }

    // Determine phone verification status
    let phoneVerified = undefined; // don't change by default
    const currentUser = await authPrisma.user.findUnique({ where: { id: req.user.id } });

    if (phone && phone !== currentUser.phone) {
      // Phone is being changed — require OTP verification
      if (phoneVerificationToken) {
        try {
          const { phone: verifiedPhone } = otpService.verifyPhoneToken(phoneVerificationToken);
          if (verifiedPhone === phone) {
            phoneVerified = true;
          } else {
            throw new AppError(400, 'PHONE_MISMATCH', 'The verified phone number does not match.');
          }
        } catch (err) {
          if (err instanceof AppError) throw err;
          throw new AppError(400, 'PHONE_VERIFICATION_FAILED', 'Phone verification token is invalid or expired. Please verify again.');
        }
      } else {
        // Phone changed without verification — mark as unverified
        phoneVerified = false;
      }
    } else if (phone && phone === currentUser.phone && !currentUser.phoneVerified && phoneVerificationToken) {
      // Same phone but unverified — user is verifying existing phone
      try {
        const { phone: verifiedPhone } = otpService.verifyPhoneToken(phoneVerificationToken);
        if (verifiedPhone === phone) {
          phoneVerified = true;
        } else {
          throw new AppError(400, 'PHONE_MISMATCH', 'The verified phone number does not match.');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(400, 'PHONE_VERIFICATION_FAILED', 'Phone verification token is invalid or expired. Please verify again.');
      }
    }

    const user = await authPrisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(gstin !== undefined && { gstin }),
        ...(phoneVerified !== undefined && { phoneVerified }),
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        gstin: true, isActive: true, emailVerified: true, phoneVerified: true,
        googleId: true, avatarUrl: true, passwordHash: true,
        createdAt: true, updatedAt: true,
      },
    });
    const { passwordHash: _, ...userData } = user;
    res.json({ success: true, data: { ...userData, hasPassword: !!_ } });
  } catch (err) { next(err); }
}

// GET /api/users/me/addresses
async function listAddresses(req, res, next) {
  try {
    const addresses = await authPrisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
}

// POST /api/users/me/addresses
async function createAddress(req, res, next) {
  try {
    const { label, line1, line2, city, state, pincode, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await authPrisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await authPrisma.address.create({
      data: { userId: req.user.id, label, line1, line2, city, state, pincode, isDefault: isDefault || false },
    });
    res.status(201).json({ success: true, data: address });
  } catch (err) { next(err); }
}

// PUT /api/users/me/addresses/:id
async function updateAddress(req, res, next) {
  try {
    const { id } = req.params;
    // Verify ownership
    const existing = await authPrisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Address not found.');

    const { label, line1, line2, city, state, pincode, isDefault } = req.body;
    if (isDefault) {
      await authPrisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await authPrisma.address.update({
      where: { id },
      data: { ...(label && { label }), ...(line1 && { line1 }), ...(line2 !== undefined && { line2 }), ...(city && { city }), ...(state && { state }), ...(pincode && { pincode }), ...(isDefault !== undefined && { isDefault }) },
    });
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
}

// DELETE /api/users/me/addresses/:id
async function deleteAddress(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await authPrisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Address not found.');

    await authPrisma.address.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Address deleted.' } });
  } catch (err) { next(err); }
}

// PUT /api/users/me/password
async function setPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const authService = require('../services/auth.service');

    const user = await authPrisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    // If user already has a password, require current password
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Current password is required.');
      }
      const { valid } = await authService.comparePassword(currentPassword, user.passwordHash);
      if (!valid) {
        throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect.');
      }
    }

    // Hash and save new password
    const passwordHash = await authService.hashPassword(newPassword);
    await authPrisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({
      success: true,
      data: { message: user.passwordHash ? 'Password changed successfully.' : 'Password set successfully. You can now sign in with email and password.' },
    });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, setPassword, listAddresses, createAddress, updateAddress, deleteAddress };
