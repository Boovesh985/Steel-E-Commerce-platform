import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';
import { cartKeys } from '../hooks/useCart';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { initiateGoogleSignIn } from '../utils/googleAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const { getToken } = useRecaptcha();

  // Fix #2: Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);
    try {
      // Fix #7: Handle reCAPTCHA failure
      const recaptchaToken = await getToken('login');
      if (recaptchaToken === null) {
        useToastStore.getState().error('Security verification unavailable. Please disable ad blockers and try again.');
        setIsLoading(false);
        return;
      }
      const data = await authApi.login({ ...form, recaptchaToken });
      login({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      useToastStore.getState().success(`Welcome back, ${data.user?.name?.split(' ')[0] || ''}.`);
      navigate(location.state?.from || '/');
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, 'Invalid email or password.') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
      login({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      useToastStore.getState().success(`Welcome, ${data.user?.name?.split(' ')[0] || ''}.`);
      navigate(location.state?.from || '/');
    } catch (err) {
      // User closed the popup — don't show error
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      setErrors({ form: apiErrorMessage(err, 'Google sign-in failed. Please try again.') });
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
        <h1 className="text-headline-md text-text text-center mb-1">Sign in to your account</h1>
        <p className="text-body-sm text-text-secondary text-center mb-6">Access your orders, quotes and saved addresses.</p>

        {errors.form && (
          <div className="bg-danger/10 text-danger text-body-sm rounded-standard px-3 py-2 mb-4">{errors.form}</div>
        )}

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
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
          <Input
            label="Email"
            type="email"
            required
            leftIcon={<Mail className="w-4 h-4" />}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-body-sm text-primary hover:text-primary-dark">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <p className="text-body-sm text-text-secondary text-center mt-6">
          New to AMK Steels?{' '}
          <Link to="/register" className="text-primary font-semibold hover:text-primary-dark">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
