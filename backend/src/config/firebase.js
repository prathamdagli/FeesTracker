const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Parse from environment variable (useful for Render production)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback to local file
  try {
    serviceAccount = require(path.join(__dirname, '../../../serviceAccountKey.json'));
  } catch (error) {
    console.warn("Could not find serviceAccountKey.json and FIREBASE_SERVICE_ACCOUNT is not set.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp(); // Initialize default if nothing else is provided
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
