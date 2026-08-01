import { useEffect, useState } from 'react';
import { User, MapPin, Lock, Trash2, Plus, Mail, Phone, LogOut, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { usePhoneAuth } from '../hooks/usePhoneAuth';
import { cartKeys } from '../hooks/useCart';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import PasswordStrengthIndicator, { isStrongPassword } from '../components/ui/PasswordStrengthIndicator';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'security', label: 'Security', icon: Lock },
];

const emptyAddress = { label: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getToken } = useRecaptcha();
  const { sendOtp: firebaseSendOtp, verifyOtp: firebaseVerifyOtp, sending: firebaseSending, verifying: firebaseVerifying, cleanup: cleanupPhone } = usePhoneAuth();

  // Only name, phone and gstin are editable — email is fixed by the backend.
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', gstin: user?.gstin || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Phone OTP state
  const PHONE_REGEX = /^[6-9]\d{9}$/;
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(!!user?.phoneVerified);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Phone didn't change from saved value
  const phoneUnchanged = profileForm.phone === (user?.phone || '');

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!PHONE_REGEX.test(profileForm.phone)) {
      setPhoneError('10-digit Indian mobile number, starting 6-9.');
      return;
    }
    setSendingOtp(true);
    setPhoneError('');
    try {
      await firebaseSendOtp(profileForm.phone, 'profile-send-otp-btn');
      setOtpSent(true);
      setOtpCountdown(30);
      useToastStore.getState().success(`OTP sent to +91 ${profileForm.phone}`);
    } catch (err) {
      setPhoneError(err.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Enter the 6-digit OTP.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await firebaseVerifyOtp(otpCode);
      setPhoneVerificationToken(res.phoneVerificationToken);
      setPhoneVerified(true);
      setOtpSent(false);
      setOtpCode('');
      setPhoneError('');
      useToastStore.getState().success('Phone number verified!');
    } catch (err) {
      setOtpError(err.message || 'Invalid OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const [resetSending, setResetSending] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);

  // Fetch fresh user profile on mount to get latest verification status
  useEffect(() => {
    authApi.me().then((freshUser) => {
      if (freshUser) {
        setUser(freshUser);
        setPhoneVerified(!!freshUser.phoneVerified);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'addresses') {
      authApi.listAddresses().then(setAddresses).catch(() => {});
    }
  }, [activeTab]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    // Phone is required for all users
    if (!profileForm.phone || !PHONE_REGEX.test(profileForm.phone)) {
      setPhoneError('A valid 10-digit phone number is required.');
      return;
    }
    // If editing phone and verified via Firebase, include token; otherwise save as unverified
    if (isEditingPhone && !phoneVerified) {
      // Phone changed without verification — will be saved as unverified
      console.log('Phone will be saved as unverified.');
    }
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone || null,
        gstin: profileForm.gstin || null,
      };
      // Include phone verification token whenever we have one (new or existing phone)
      if (phoneVerificationToken) {
        payload.phoneVerificationToken = phoneVerificationToken;
      }
      const res = await authApi.updateProfile(payload);
      const updatedUser = res.data || res;
      setUser(updatedUser);
      setPhoneVerified(!!updatedUser.phoneVerified);
      setPhoneVerificationToken(null);
      setIsEditingPhone(false);
      setPhoneError('');
      useToastStore.getState().success('Profile updated.');
    } catch (err) {
      useToastStore.getState().error(apiErrorMessage(err, 'Could not update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendResetLink = async () => {
    setResetSending(true);
    try {
      const recaptchaToken = await getToken('forgot_password');
      await authApi.forgotPassword(user.email, recaptchaToken);
      useToastStore.getState().success(`Password reset link sent to ${user.email}.`);
    } catch (err) {
      useToastStore.getState().error(apiErrorMessage(err, 'Could not send reset link.'));
    } finally {
      setResetSending(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await authApi.addAddress(newAddress);
      setAddresses((prev) => [...prev, created]);
      setIsAddingAddress(false);
      setNewAddress(emptyAddress);
    } catch (err) {
      useToastStore.getState().error(apiErrorMessage(err, 'Could not save this address.'));
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await authApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      useToastStore.getState().error(apiErrorMessage(err, 'Could not delete this address.'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-10">
      <h1 className="text-headline-lg text-text mb-6 text-center">My account</h1>

      <div className="flex gap-2 justify-center overflow-x-auto pb-2 mb-8 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 h-10 rounded-standard text-body-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-surface border border-border rounded-container p-5 flex flex-col gap-4 w-full">
          <Input label="Full name" required value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            leftIcon={<Mail className="w-4 h-4" />}
            hint="Email can't be changed."
          />

          {/* Google account badge */}
          {user?.googleId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-standard">
              <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              <span className="text-body-sm text-blue-700 font-medium">Google account linked</span>
            </div>
          )}

          {/* Phone with OTP verification */}
          <div className="flex flex-col gap-1">
            <Input
              label="Phone"
              required
              leftIcon={<Phone className="w-4 h-4" />}
              value={profileForm.phone}
              error={phoneError}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setProfileForm((f) => ({ ...f, phone: val }));
              }}
            />
            {!profileForm.phone && (
              <p className="text-body-sm text-text-secondary mt-1">Add a phone number for delivery updates and order verification.</p>
            )}
          </div>

          <Input label="GSTIN" value={profileForm.gstin} onChange={(e) => setProfileForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} />
          <Button type="submit" isLoading={savingProfile} className="self-start">Save changes</Button>
        </form>
      )}

      {activeTab === 'addresses' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setIsAddingAddress(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add address
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start justify-between bg-surface border border-border rounded-container p-4">
                <div className="text-body-sm">
                  <p className="text-text font-medium">{addr.label}{addr.isDefault ? ' · Default' : ''}</p>
                  <p className="text-text">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                  <p className="text-text-secondary">{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)} className="text-text-secondary hover:text-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {addresses.length === 0 && <p className="text-body-sm text-text-secondary">No saved addresses yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-surface border border-border rounded-container p-5 flex flex-col gap-5 w-full">
          <PasswordSection user={user} setUser={setUser} />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Reset via email link (alternative) */}
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-text">Reset via email</p>
            <p className="text-body-sm text-text-secondary">
              We'll email a reset link to <span className="text-text font-medium">{user?.email}</span>.
            </p>
          </div>
          <Button onClick={handleSendResetLink} isLoading={resetSending} variant="secondary" className="self-start">
            Send reset link
          </Button>
        </div>
      )}

      <Modal isOpen={isAddingAddress} onClose={() => setIsAddingAddress(false)} title="Add address">
        <form onSubmit={handleAddAddress} className="flex flex-col gap-4">
          <Input label="Label" required placeholder="e.g. Site office, Warehouse" value={newAddress.label} onChange={(e) => setNewAddress((a) => ({ ...a, label: e.target.value }))} />
          <Input label="Address line 1" required value={newAddress.line1} onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))} />
          <Input label="Address line 2" value={newAddress.line2} onChange={(e) => setNewAddress((a) => ({ ...a, line2: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" required value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} />
            <Input label="State" required value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} />
          </div>
          <Input label="Pincode" required value={newAddress.pincode} onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value }))} />
          <label className="flex items-center gap-2 text-body-sm text-text">
            <input type="checkbox" checked={newAddress.isDefault} onChange={(e) => setNewAddress((a) => ({ ...a, isDefault: e.target.checked }))} className="accent-primary" />
            Set as default address
          </label>
          <Button type="submit" fullWidth>Save address</Button>
        </form>
      </Modal>

      {/* Sign out */}
      <div className="mt-10 pt-6 border-t border-border">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-danger transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Sign out confirmation modal */}
      <Modal isOpen={showSignOutConfirm} onClose={() => setShowSignOutConfirm(false)} size="sm">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <LogOut className="w-7 h-7 text-danger" />
          </div>
          <h3 className="text-headline-md text-text mb-1">Sign out?</h3>
          <p className="text-body-sm text-text-secondary mb-6">
            You're signed in as <span className="font-medium text-text">{user?.name || user?.email}</span>. Are you sure you want to sign out?
          </p>
          <div className="flex gap-3 w-full">
            <Button variant="outline" fullWidth onClick={() => setShowSignOutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                try { await authApi.logout(); } catch { /* proceed even if revocation fails */ }
                logoutStore();
                queryClient.removeQueries({ queryKey: cartKeys.all });
                navigate('/');
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Password Section (Set / Change) ──────────────────────────────────────
function PasswordSection({ user, setUser }) {
  const hasPassword = user?.hasPassword;
  const isGoogleOnly = !!user?.googleId && !hasPassword;

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validate = () => {
    const next = {};
    if (hasPassword && !form.currentPassword) next.currentPassword = 'Current password is required.';
    if (form.newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters.';
    else if (!isStrongPassword(form.newPassword)) next.newPassword = 'Password does not meet all strength requirements.';
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = { newPassword: form.newPassword };
      if (hasPassword) payload.currentPassword = form.currentPassword;
      await authApi.setPassword(payload);
      // Show success popup
      setSuccessMessage(
        hasPassword
          ? 'Your password has been changed successfully.'
          : 'Your password has been set successfully! You can now sign in with your email and password.'
      );
      setShowSuccess(true);
      setUser({ ...user, hasPassword: true });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not update password.');
      if (err?.response?.data?.error?.code === 'INVALID_PASSWORD') {
        setErrors({ currentPassword: msg });
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-1 mb-4">
        <p className="text-label-md text-text">
          {isGoogleOnly ? 'Set a password' : hasPassword ? 'Change your password' : 'Set a password'}
        </p>
        <p className="text-body-sm text-text-secondary">
          {isGoogleOnly
            ? 'You signed in with Google. Set a password to also sign in with email and password.'
            : hasPassword
              ? 'Update your current password.'
              : 'Add a password to sign in with email and password.'}
        </p>
      </div>

      {errors.form && (
        <div className="bg-danger/10 text-danger text-body-sm rounded-standard px-3 py-2 mb-3">{errors.form}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {hasPassword && (
          <Input
            label="Current password"
            type="password"
            required
            error={errors.currentPassword}
            leftIcon={<Lock className="w-4 h-4" />}
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
        )}
        <Input
          label="New password"
          type="password"
          required
          error={errors.newPassword}
          leftIcon={<Lock className="w-4 h-4" />}
          value={form.newPassword}
          onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
        />
        <PasswordStrengthIndicator password={form.newPassword} />
        <Input
          label="Confirm new password"
          type="password"
          required
          error={errors.confirmPassword}
          leftIcon={<Lock className="w-4 h-4" />}
          value={form.confirmPassword}
          onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
        />
        <Button type="submit" isLoading={saving} className="self-start">
          {hasPassword ? 'Change password' : 'Set password'}
        </Button>
      </form>

      {/* Success Modal */}
      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} size="sm">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-headline-md text-text mb-2">Password {user?.hasPassword ? 'updated' : 'set'}!</h3>
          <p className="text-body-sm text-text-secondary mb-6">{successMessage}</p>
          <Button onClick={() => setShowSuccess(false)} fullWidth>Done</Button>
        </div>
      </Modal>
    </div>
  );
}
