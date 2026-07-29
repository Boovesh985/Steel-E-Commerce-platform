import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../api/client';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { useToastStore } from '../stores/toastStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { getToken } = useRecaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // Fix #3: Send reCAPTCHA token with forgot-password
      const recaptchaToken = await getToken('forgot_password');
      if (recaptchaToken === null) {
        useToastStore.getState().error('Security verification unavailable. Please disable ad blockers and try again.');
        setIsLoading(false);
        return;
      }
      await authApi.forgotPassword(email, recaptchaToken);
      setSubmitted(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send reset instructions.'));
    } finally {
      setIsLoading(false);
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

        {submitted ? (
          <div className="text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <h1 className="text-headline-md text-text">Check your email</h1>
            <p className="text-body-sm text-text-secondary">
              If an account exists for <span className="text-text font-medium">{email}</span>, we've sent a link to reset your password.
            </p>
            <Link to="/login" className="text-primary font-semibold text-body-sm mt-2">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-headline-md text-text text-center mb-1">Reset your password</h1>
            <p className="text-body-sm text-text-secondary text-center mb-6">
              Enter your email and we'll send you instructions to reset it.
            </p>

            {error && <div className="bg-danger/10 text-danger text-body-sm rounded-standard px-3 py-2 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                required
                leftIcon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                Send reset link
              </Button>
            </form>

            <p className="text-body-sm text-text-secondary text-center mt-6">
              <Link to="/login" className="text-primary font-semibold hover:text-primary-dark">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
