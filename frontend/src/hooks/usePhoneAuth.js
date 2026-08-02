/**
 * Phone Auth hook — DISABLED.
 * Phone verification is currently unavailable (no SMS service active).
 * This stub preserves the export so any remaining imports don't break.
 */

export function usePhoneAuth() {
  return {
    sendOtp: async () => { throw new Error('Phone verification is currently unavailable.'); },
    verifyOtp: async () => { throw new Error('Phone verification is currently unavailable.'); },
    sending: false,
    verifying: false,
    cleanup: () => {},
  };
}
