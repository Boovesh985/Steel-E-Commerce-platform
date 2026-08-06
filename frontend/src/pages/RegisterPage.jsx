import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Building2, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { usePhoneAuth } from '../hooks/usePhoneAuth';
import { initiateGoogleSignIn } from '../utils/googleAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PasswordStrengthIndicator, { isStrongPassword } from '../components/ui/PasswordStrengthIndicator';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { getToken } = useRecaptcha();
  const { sendOtp: firebaseSendOtp, verifyOtp: firebaseVerifyOtp, sending: firebaseSending, verifying: firebaseVerifying, cleanup: cleanupPhone } = usePhoneAuth();

  // Fix #2: Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', gstin: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(null);

  // Fix #5: OTP countdown timer
  const [otpCountdown, setOtpCountdown] = useState(0);
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Fix #8: Enhanced frontend validation
  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!EMAIL_REGEX.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    else if (!isStrongPassword(form.password)) next.password = 'Password does not meet all strength requirements.';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    if (!PHONE_REGEX.test(form.phone)) next.phone = '10-digit Indian mobile number, starting 6-9.';
    if (form.gstin && !GSTIN_REGEX.test(form.gstin)) next.gstin = 'Enter a valid 15-character GSTIN.';
    return next;
  };

  // ── Send OTP (via Firebase Phone Auth) ─────────────────────────────────
  const handleSendOtp = async () => {
    if (!PHONE_REGEX.test(form.phone)) {
      setErrors((e) => ({ ...e, phone: '10-digit Indian mobile number, starting 6-9.' }));
      return;
    }
    if (!EMAIL_REGEX.test(form.email)) {
      setErrors((e) => ({ ...e, email: 'Enter a valid email address first.' }));
      return;
    }
    setSendingOtp(true);
    setErrors((e) => ({ ...e, phone: undefined, email: undefined }));
    try {
      // Check email and phone availability before sending OTP
      const availability = await authApi.checkAvailability({ email: form.email, phone: form.phone });
      if (!availability.emailAvailable) {
        setErrors((e) => ({ ...e, email: 'This email is already registered. Try signing in instead.' }));
        setSendingOtp(false);
        return;
      }
      if (!availability.phoneAvailable) {
        setErrors((e) => ({ ...e, phone: 'This phone number is already registered to another account.' }));
        setSendingOtp(false);
        return;
      }

      await firebaseSendOtp(form.phone, 'reg-send-otp-btn');
      setOtpSent(true);
      setOtpCountdown(30);
      useToastStore.getState().success(`OTP sent to +91 ${form.phone}`);
    } catch (err) {
      console.error('OTP send error:', err);
      setErrors((e) => ({ ...e, phone: err.message || 'Failed to send OTP. Please try again.' }));
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Verify OTP (via Firebase Phone Auth) ──────────────────────────────
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setErrors((e) => ({ ...e, otp: 'Enter the 6-digit OTP.' }));
      return;
    }
    setVerifyingOtp(true);
    setErrors((e) => ({ ...e, otp: undefined }));
    try {
      const res = await firebaseVerifyOtp(otpCode);
      setPhoneVerificationToken(res.phoneVerificationToken);
      setPhoneVerified(true);
      useToastStore.getState().success('Phone number verified!');
    } catch (err) {
      console.error('OTP verify error:', err);
      setErrors((e) => ({ ...e, otp: err.message || 'Invalid OTP. Please check and try again.' }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── Email/Password Register ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      // Get reCAPTCHA token — if null, still try (backend will return a clear error)
      const recaptchaToken = await getToken('register');
      const { confirmPassword, gstin, ...rest } = form;
      const payload = { ...rest, gstin: gstin || undefined, phoneVerificationToken, recaptchaToken };
      const data = await authApi.register(payload);
      loginStore({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      useToastStore.getState().success('Account created. Welcome to AMK Steels.');
      navigate('/');
    } catch (err) {
      // Show detailed validation errors from the backend if available
      const details = err?.response?.data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        const fieldErrors = {};
        details.forEach(d => {
          if (d.path) fieldErrors[d.path] = d.message;
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setErrors({ form: apiErrorMessage(err, 'Could not create your account.') });
        }
      } else {
        setErrors({ form: apiErrorMessage(err, 'Could not create your account.') });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google Sign-Up ────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setErrors({});
    setGoogleLoading(true);
    try {
      const result = await initiateGoogleSignIn();
      // On native, result is null because the page redirects away.
      // The sign-in is completed in App.jsx via handleGoogleRedirectResult.
      if (!result) return;
      // Web flow: we have the idToken from the popup
      const recaptchaToken = await getToken('google_auth');
      const data = await authApi.googleAuth(result.idToken, recaptchaToken);
      loginStore({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      useToastStore.getState().success(`Welcome, ${data.user?.name?.split(' ')[0] || ''}.`);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      setErrors({ form: apiErrorMessage(err, 'Google sign-up failed. Please try again.') });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-bg">
      <div className="w-full max-w-md bg-surface border border-border rounded-container p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-10 h-10 bg-primary rounded-standard flex items-center justify-center">
            <span className="text-white font-mono font-bold text-sm">AMK</span>
          </div>
        </div>
        <h1 className="text-headline-md text-text text-center mb-1">Create your account</h1>
        <p className="text-body-sm text-text-secondary text-center mb-6">Order steel products with tracked delivery and invoicing.</p>

        {errors.form && (
          <div className="bg-danger/10 text-danger text-body-sm rounded-standard px-3 py-2 mb-4">{errors.form}</div>
        )}

        {/* Google Sign-Up */}
        <button
          onClick={handleGoogleSignUp}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-standard border border-border bg-white hover:bg-gray-50 text-text font-medium text-body-sm transition-colors disabled:opacity-60"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-body-sm text-text-secondary">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" required error={errors.name} leftIcon={<User className="w-4 h-4" />} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" required error={errors.email} leftIcon={<Mail className="w-4 h-4" />} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />

          {/* Phone */}
          <Input
            label="Phone"
            required
            error={errors.phone}
            leftIcon={<Phone className="w-4 h-4" />}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
          />
          {!errors.phone && (
            <p className="text-body-sm text-text-secondary -mt-3">10-digit Indian mobile number</p>
          )}

          <Input
            label="GSTIN (optional)"
            error={errors.gstin}
            leftIcon={<Building2 className="w-4 h-4" />}
            value={form.gstin}
            onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
          />
          <Input label="Password" type="password" required error={errors.password} leftIcon={<Lock className="w-4 h-4" />} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <PasswordStrengthIndicator password={form.password} />
          <Input label="Confirm password" type="password" required error={errors.confirmPassword} leftIcon={<Lock className="w-4 h-4" />} value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            Create account
          </Button>
        </form>

        {/* Fix #9: Terms of Service */}
        <p className="text-[12px] text-text-secondary text-center mt-4 leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-primary hover:text-primary-dark">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-primary hover:text-primary-dark">Privacy Policy</Link>.
        </p>

        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container" />

        <p className="text-body-sm text-text-secondary text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:text-primary-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
