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

  let serviceAccount;

  // Option 1: Service account JSON passed directly as env var (for cloud deployments)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      return null;
    }
  }
  // Option 2: Service account file path (for local development)
  else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const absolutePath = path.isAbsolute(env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? env.FIREBASE_SERVICE_ACCOUNT_PATH
      : path.resolve(__dirname, '../../', env.FIREBASE_SERVICE_ACCOUNT_PATH);
    try {
      serviceAccount = require(absolutePath);
    } catch (err) {
      console.warn('⚠️  Firebase service account file not found:', absolutePath);
      return null;
    }
  } else {
    console.warn('⚠️  Firebase not configured — set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH');
    return null;
  }

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
