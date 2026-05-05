const { db } = require('../config/firebase');

/**
 * Modular Payment Controller
 */
const paymentController = {
  // Get all payments/transactions (sorted in-memory to avoid Firestore index requirement)
  getAll: async (req, res) => {
    try {
      const snapshot = await db.collection('payments').get();
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to ISO strings
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        };
      });
      // Sort by date descending in memory
      payments.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Record a new payment
  record: async (req, res) => {
    try {
      const { studentId, studentName, amount, date, method, invoiceId } = req.body;

      const paymentData = {
        studentId,
        studentName: studentName || '',
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        method: method || 'Cash',
        invoiceId: invoiceId || `INV-${Date.now()}`,
        type: 'Credit',
        status: 'Completed',
        createdAt: new Date()
      };

      const docRef = await db.collection('payments').add(paymentData);

      // Update student's payment status
      if (studentId) {
        await db.collection('students').doc(studentId).update({
          lastPaymentDate: new Date(),
          status: 'Active'
        });
      }

      res.status(201).json({ id: docRef.id, ...paymentData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get transaction history for a specific student
  getByStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const snapshot = await db.collection('payments')
        .where('studentId', '==', id)
        .get();

      const history = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        };
      });
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a payment by ID
  remove: async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('payments').doc(id).delete();
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = paymentController;
