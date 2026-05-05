const admin = require('firebase-admin');
const path = require('path');

// NOTE: You must place your serviceAccountKey.json in the root directory
const serviceAccount = require(path.join(__dirname, '../../../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
