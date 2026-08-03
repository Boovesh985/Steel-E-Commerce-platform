/**
 * Google Sign-In utility.
 *
 * - Web: Uses Firebase signInWithPopup (works in regular browsers).
 * - Android (Capacitor): Uses @codetrix-studio/capacitor-google-auth
 *   which opens the native Google account picker. The returned Google
 *   ID token is exchanged for a Firebase credential to get a Firebase
 *   ID token that our backend can verify.
 */
import { Capacitor } from '@capacitor/core';
import {
  auth,
  googleProvider,
  signInWithPopup,
} from '../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

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

  // Web: use Firebase popup (existing behavior)
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  await auth.signOut();
  return { idToken };
}
