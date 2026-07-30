/**
 * Phone verification service.
 * Verifies Firebase Phone Auth ID tokens to confirm phone ownership.
 *
 * Flow:
 *   1. Frontend uses Firebase signInWithPhoneNumber to send OTP
 *   2. User enters OTP, Firebase verifies it client-side
 *   3. Frontend gets a Firebase ID token containing the verified phone number
 *   4. Backend verifies this token using Firebase Admin SDK
 */
const { verifyFirebaseToken } = require('../config/firebase-admin');

/**
 * Verify a phone verification token (Firebase ID token from Phone Auth).
 * Returns { phone } if valid, throws if invalid.
 *
 * @param {string} token - Firebase ID token from phone auth
 * @returns {{ phone: string }} - The verified phone number (10-digit, no country code)
 */
async function verifyPhoneToken(token) {
  if (!token) {
    throw new Error('Phone verification token is required.');
  }

  const decoded = await verifyFirebaseToken(token);

  // Firebase Phone Auth stores the number as +91XXXXXXXXXX
  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) {
    throw new Error('Token does not contain a verified phone number.');
  }

  // Strip country code (+91) to get the 10-digit number
  const phone = phoneNumber.replace(/^\+91/, '');

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Invalid Indian phone number in token.');
  }

  return { phone };
}

module.exports = { verifyPhoneToken };
