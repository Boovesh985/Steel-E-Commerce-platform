/**
 * Google Sign-In utility — handles both web (popup) and native mobile (redirect) flows.
 *
 * On the web, Firebase's signInWithPopup works fine.
 * On a Capacitor native app (Android), popups open in the system browser (Chrome)
 * and can't communicate back to the WebView, so we use signInWithRedirect instead.
 *
 * After a redirect sign-in, the app reloads and getRedirectResult is called in
 * App.jsx to complete the authentication.
 */
import { Capacitor } from '@capacitor/core';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from '../config/firebase';

/**
 * Initiate Google Sign-In.
 *
 * - Web: Opens a popup, resolves with { idToken }.
 * - Native: Triggers a redirect (the page navigates away). Returns null.
 *   The result is picked up by handleGoogleRedirectResult() on app reload.
 */
export async function initiateGoogleSignIn() {
  if (Capacitor.isNativePlatform()) {
    // Mark that a Google sign-in redirect is in progress so the app knows
    // to complete it when it reloads.
    sessionStorage.setItem('amk_google_auth_pending', '1');
    await signInWithRedirect(auth, googleProvider);
    // The page navigates away — this line is never reached.
    return null;
  }

  // Web: use popup (existing behavior)
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  await auth.signOut();
  return { idToken };
}

/**
 * Check for a pending Google redirect result on app load.
 * Call this once in App.jsx on mount for native platforms.
 *
 * @returns {{ idToken: string } | null} — the Firebase ID token if a redirect
 *   result was found, or null if there was no pending redirect.
 */
export async function handleGoogleRedirectResult() {
  if (!Capacitor.isNativePlatform()) return null;

  // Only process if we initiated a redirect
  const pending = sessionStorage.getItem('amk_google_auth_pending');
  if (!pending) return null;

  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const idToken = await result.user.getIdToken();
    await auth.signOut();
    return { idToken };
  } catch (err) {
    // User cancelled or error occurred
    console.error('Google redirect result error:', err);
    return null;
  } finally {
    sessionStorage.removeItem('amk_google_auth_pending');
  }
}
