/**
 * Firebase Admin SDK initialization.
 * Used for verifying Firebase ID tokens (Google Sign-In, Phone Auth).
 *
 * firebase-admin v14 API:
 *   - admin.cert() instead of admin.credential.cert()
 *   - getAuth() from 'firebase-admin/auth' instead of admin.auth()
 */
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const env = require('./env');

let firebaseApp;

function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not set — Firebase features disabled.');
    return null;
  }

  const absolutePath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(__dirname, '../../', serviceAccountPath);

  const serviceAccount = require(absolutePath);

  firebaseApp = admin.initializeApp({
    credential: admin.cert(serviceAccount),
  });

  console.log('🔥 Firebase Admin SDK initialized');
  return firebaseApp;
}

/**
 * Verify a Firebase ID token and return the decoded user info.
 */
async function verifyFirebaseToken(idToken) {
  const app = getFirebaseAdmin();
  if (!app) throw new Error('Firebase Admin not configured');
  return getAuth(app).verifyIdToken(idToken);
}

module.exports = { getFirebaseAdmin, verifyFirebaseToken };
