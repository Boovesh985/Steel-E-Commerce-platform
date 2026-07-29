/**
 * Firebase Web SDK configuration.
 * Used for Google Sign-In only.
 * Phone OTP is now handled by Fast2SMS via the backend.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'your-firebase-api-key',
  authDomain: 'steel-app-8eec1.firebaseapp.com',
  projectId: 'steel-app-8eec1',
  storageBucket: 'steel-app-8eec1.firebasestorage.app',
  messagingSenderId: '184908462149',
  appId: '1:184908462149:web:c0424b8cc9b2a8da074b2c',
  measurementId: 'G-DHPY689M8H',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set language to browser default
auth.useDeviceLanguage();

const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup };
