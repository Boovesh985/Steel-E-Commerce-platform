/**
 * Google Sign-In utility — uses popup flow for both web and native.
 *
 * signInWithPopup works in Capacitor 5+ with androidScheme: "https"
 * because it opens a Chrome Custom Tab that can communicate back
 * to the WebView. The old signInWithRedirect flow is removed because
 * it silently fails on Android (session state lost on redirect).
 */
import {
  auth,
  googleProvider,
  signInWithPopup,
} from '../config/firebase';

/**
 * Initiate Google Sign-In via popup on all platforms.
 * @returns {{ idToken: string }} The Firebase ID token.
 */
export async function initiateGoogleSignIn() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  // Sign out of Firebase — our backend manages its own sessions
  await auth.signOut();
  return { idToken };
}
