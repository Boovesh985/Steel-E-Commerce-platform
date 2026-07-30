import apiClient from './client';
import { useAuthStore } from '../stores/authStore';

export const authApi = {
  // { name, email, phone, password, gstin? } — phone must be a 10-digit
  // Indian mobile number starting 6-9; gstin is validated server-side if sent.
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),

  // Check if email/phone is already in use (for pre-validation before Firebase OTP)
  checkAvailability: (payload) => apiClient.post('/otp/check-availability', payload).then((r) => r.data),

  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),

  // Firebase Google Sign-In — sends the Firebase ID token to our backend
  googleAuth: (idToken, recaptchaToken) => apiClient.post('/auth/google', { idToken, recaptchaToken }).then((r) => r.data),

  logout: () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    return apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data);
  },

  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  forgotPassword: (email, recaptchaToken) => apiClient.post('/auth/forgot-password', { email, recaptchaToken }).then((r) => r.data),

  // { token, password } — token comes from the reset link sent by forgot-password.
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload).then((r) => r.data),

  me: () => apiClient.get('/users/me').then((r) => r.data),

  // { name?, phone?, gstin? } — email is not editable via this endpoint.
  updateProfile: (payload) => apiClient.put('/users/me', payload).then((r) => r.data),

  // { currentPassword?, newPassword } — currentPassword only required if user already has one
  setPassword: (payload) => apiClient.put('/users/me/password', payload).then((r) => r.data),

  listAddresses: () => apiClient.get('/users/me/addresses').then((r) => r.data),

  // { label, line1, line2?, city, state, pincode, isDefault? }
  addAddress: (payload) => apiClient.post('/users/me/addresses', payload).then((r) => r.data),

  updateAddress: (id, payload) => apiClient.put(`/users/me/addresses/${id}`, payload).then((r) => r.data),

  deleteAddress: (id) => apiClient.delete(`/users/me/addresses/${id}`).then((r) => r.data),
};
