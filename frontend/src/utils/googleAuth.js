/**
 * Google Sign-In utility.
 *
 * - Web: Uses Firebase signInWithPopup with prompt=select_account
 *   so the account picker always shows (even after sign out).
 * - Android (Capacitor): Uses @codetrix-studio/capacitor-google-auth
 *   which opens the native Google account picker.
 */
import { Capacitor } from '@capacitor/core';
import {
  auth,
  googleProvider,
  signInWithPopup,
} from '../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Force account selection every time (don't auto-pick last account)
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Initiate Google Sign-In.
 * @returns {{ idToken: string }} The Firebase ID token.
 */
export async function initiateGoogleSignIn() {
  if (Capacitor.isNativePlatform()) {
    // Native: use the Capacitor Google Auth plugin
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

    // Initialize on first call
    await GoogleAuth.initialize({
      clientId: 'your-google-client-id.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });

    // Sign out first to force account picker on next sign-in
    try { await GoogleAuth.signOut(); } catch {}

    const googleUser = await GoogleAuth.signIn();
    const googleIdToken = googleUser.authentication.idToken;

    // Exchange Google ID token for Firebase credential
    const credential = GoogleAuthProvider.credential(googleIdToken);
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseIdToken = await userCredential.user.getIdToken();

    // Sign out of Firebase — our backend manages its own sessions
    await auth.signOut();
    return { idToken: firebaseIdToken };
  }

  // Web: use Firebase popup — prompt=select_account forces account picker
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  await auth.signOut();
  return { idToken };
}

/**
 * Sign out of Google on the native platform.
 * Call this when the user signs out of our app.
 */
export async function signOutGoogle() {
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.signOut();
    } catch {}
  }
  // Firebase sign out (clears any cached Firebase auth state)
  try { await auth.signOut(); } catch {}
}
