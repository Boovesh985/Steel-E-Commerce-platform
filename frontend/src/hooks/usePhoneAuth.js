/**
 * Firebase Phone Auth hook — sends OTP via Firebase and verifies it.
 * Returns a Firebase ID token containing the verified phone number,
 * which the backend verifies using Firebase Admin SDK.
 */
import { useState, useCallback, useRef } from 'react';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../config/firebase';

export function usePhoneAuth() {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  /**
   * Initialize invisible reCAPTCHA for Firebase Phone Auth.
   * Must be called before sendOtp. The buttonId is the element
   * that Firebase will attach the invisible reCAPTCHA to.
   */
  const setupRecaptcha = useCallback((buttonId) => {
    // Clean up existing verifier
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch {}
      recaptchaRef.current = null;
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, buttonId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved — will proceed with signInWithPhoneNumber
      },
    });
  }, []);

  /**
   * Send OTP to the given 10-digit Indian phone number.
   * @param {string} phone - 10-digit number (e.g. '8248020905')
   * @param {string} buttonId - DOM element ID for reCAPTCHA attachment
   */
  const sendOtp = useCallback(async (phone, buttonId = 'phone-verify-btn') => {
    setSending(true);
    try {
      // Setup reCAPTCHA if not already done
      if (!recaptchaRef.current) {
        setupRecaptcha(buttonId);
      }

      const formattedPhone = `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      confirmationRef.current = confirmation;
      return { success: true };
    } catch (err) {
      // Reset reCAPTCHA on error so it can be re-initialized
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch {}
        recaptchaRef.current = null;
      }
      console.error('Firebase Phone Auth error:', err.code, err.message);

      // Map Firebase error codes to user-friendly messages
      const errorMessages = {
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-phone-number': 'Invalid phone number format.',
        'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
        'auth/captcha-check-failed': 'Security verification failed. Please refresh and try again.',
        'auth/missing-phone-number': 'Phone number is required.',
      };

      throw new Error(errorMessages[err.code] || err.message || 'Failed to send OTP.');
    } finally {
      setSending(false);
    }
  }, [setupRecaptcha]);

  /**
   * Verify the OTP entered by the user.
   * Returns { success, phoneVerificationToken } on success.
   * The token is a Firebase ID token that the backend can verify.
   */
  const verifyOtp = useCallback(async (otp) => {
    if (!confirmationRef.current) {
      throw new Error('Please send OTP first.');
    }
    setVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      // Sign out of Firebase immediately — we only need the token
      await auth.signOut();
      confirmationRef.current = null;
      return { success: true, phoneVerificationToken: idToken };
    } catch (err) {
      console.error('OTP verification error:', err.code, err.message);
      const errorMessages = {
        'auth/invalid-verification-code': 'Invalid OTP. Please check and try again.',
        'auth/code-expired': 'OTP has expired. Please request a new one.',
        'auth/missing-verification-code': 'Please enter the 6-digit OTP.',
      };
      throw new Error(errorMessages[err.code] || err.message || 'Invalid OTP.');
    } finally {
      setVerifying(false);
    }
  }, []);

  /**
   * Cleanup reCAPTCHA and confirmation state.
   */
  const cleanup = useCallback(() => {
    confirmationRef.current = null;
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch {}
      recaptchaRef.current = null;
    }
  }, []);

  return { sendOtp, verifyOtp, sending, verifying, cleanup };
}
