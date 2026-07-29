import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../api/client';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PasswordStrengthIndicator, { isStrongPassword } from '../components/ui/PasswordStrengthIndicator';

// Reached via the link sent by POST /auth/forgot-password, e.g. /reset-password?token=...
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!isStrongPassword(password)) return setError('Password does not meet all strength requirements.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setError('');
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'This reset link may have expired. Request a new one.'));
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

        {done ? (
          <div className="text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <h1 className="text-headline-md text-text">Password reset</h1>
            <p className="text-body-sm text-text-secondary">You can sign in with your new password now.</p>
            <Button onClick={() => navigate('/login')} className="mt-2">Go to sign in</Button>
          </div>
        ) : (
          <>
            <h1 className="text-headline-md text-text text-center mb-1">Set a new password</h1>
            <p className="text-body-sm text-text-secondary text-center mb-6">Choose a new password for your account.</p>

            {!token && (
              <div className="bg-warning/10 text-warning text-body-sm rounded-standard px-3 py-2 mb-4">
                This link is missing a reset token — request a new one from the forgot password page.
              </div>
            )}
            {error && <div className="bg-danger/10 text-danger text-body-sm rounded-standard px-3 py-2 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="New password" type="password" required leftIcon={<Lock className="w-4 h-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
              <PasswordStrengthIndicator password={password} />
              <Input label="Confirm new password" type="password" required leftIcon={<Lock className="w-4 h-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button type="submit" fullWidth size="lg" isLoading={isLoading} disabled={!token}>
                Reset password
              </Button>
            </form>

            <p className="text-body-sm text-text-secondary text-center mt-6">
              <Link to="/login" className="text-primary font-semibold hover:text-primary-dark">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
