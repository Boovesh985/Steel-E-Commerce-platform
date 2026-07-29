/**
 * Zod schemas for auth-related requests.
 */
const { z } = require('zod');

// Strong password: min 8 chars + uppercase + lowercase + digit + special char
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((pw) => /[A-Z]/.test(pw), 'Password must contain at least one uppercase letter')
  .refine((pw) => /[a-z]/.test(pw), 'Password must contain at least one lowercase letter')
  .refine((pw) => /\d/.test(pw), 'Password must contain at least one number')
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), 'Password must contain at least one special character');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)'),
  password: strongPassword,
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, 'Invalid GSTIN format').optional().nullable(),
  phoneVerificationToken: z.string().optional(),
  recaptchaToken: z.string().optional(),
}).strip();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z.string().optional(),
}).strip();

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  recaptchaToken: z.string().optional(),
}).strip();

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  recaptchaToken: z.string().optional(),
}).strip();

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: strongPassword,
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)').optional()
  ),
  gstin: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, 'Invalid GSTIN format').optional().nullable()
  ),
  phoneVerificationToken: z.string().optional(),
});

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)'),
  isDefault: z.boolean().optional(),
});

const setPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: strongPassword,
});

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  addressSchema,
  setPasswordSchema,
};
