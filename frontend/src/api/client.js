import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../stores/authStore';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const defaultHeaders = { 'Content-Type': 'application/json' };

// Tell the backend this is a native mobile app so it can skip reCAPTCHA
// (reCAPTCHA v3 doesn't work in Capacitor WebViews — origin is https://localhost)
if (Capacitor.isNativePlatform()) {
  defaultHeaders['X-App-Platform'] = 'capacitor';
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: defaultHeaders,
  timeout: 20000,
});

// ---- Request interceptor: attach JWT ----
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response interceptor ----
// The backend wraps every response as { success, data, error: { code, message } }.
// We unwrap `data` here so every api/*.js call site can keep doing
// `apiClient.get(...).then((r) => r.data)` and get the real payload directly,
// instead of the envelope. Error responses are left as-is (envelope intact)
// so callers can read `err.response.data.error.message` / `.code`.
let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === 'object' && 'success' in response.data) {
      const envelope = response.data;
      if (envelope.pagination && Array.isArray(envelope.data)) {
        // Paginated list endpoint: reshape to { items[], page, total, totalPages, limit }
        response.data = { items: envelope.data, ...envelope.pagination };
      } else {
        response.data = envelope.data;
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const payload = data?.data ?? data; // tolerate envelope or raw shape here too
        const newAccessToken = payload.accessToken;
        useAuthStore.getState().setTokens({
          accessToken: newAccessToken,
          refreshToken: payload.refreshToken || refreshToken,
        });
        flushQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Reads a human-readable message off a failed request, matching the
 * backend's { success:false, error: { code, message } } envelope.
 */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export default apiClient;
