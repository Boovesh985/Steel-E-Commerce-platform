/**
 * Firebase Web SDK configuration.
 * Used for Google Sign-In and Phone OTP verification.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

// Firebase web config — these are PUBLIC keys (restricted by Firebase Security Rules, not secrecy).
// Using env vars allows different Firebase projects per environment.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-firebase-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'steel-app-8eec1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'steel-app-8eec1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'steel-app-8eec1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '184908462149',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:184908462149:web:c0424b8cc9b2a8da074b2c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DHPY689M8H',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set language to browser default
auth.useDeviceLanguage();

const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup };

