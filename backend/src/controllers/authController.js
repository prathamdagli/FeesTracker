const { auth, db } = require('../config/firebase');

/**
 * Modular Auth Controller
 */
const authController = {
  // Simple Login (Verify Firebase ID Token from client)
  login: async (req, res) => {
    try {
      const { idToken } = req.body;
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Get user data from Firestore if needed
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : { uid, email: decodedToken.email };
      
      res.json({ status: 'success', user: userData });
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized', message: error.message });
    }
  },

  // Register a new admin user
  register: async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      const userRecord = await auth.createUser({
        email,
        password,
        displayName
      });
      
      // Save to Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        role: 'Admin',
        createdAt: new Date()
      });
      
      res.status(201).json({ status: 'success', uid: userRecord.uid });
    } catch (error) {
      res.status(400).json({ error: 'Registration failed', message: error.message });
    }
  }
};

module.exports = authController;
