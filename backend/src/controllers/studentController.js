const { db } = require('../config/firebase');

// Strip generic school suffixes so "Zydus" and "Zydus School" share the same key
const normalizeKey = (name = '') =>
  name.trim()
    .replace(/\s+(higher secondary|high school|senior secondary|secondary school|public school|school|vidyalaya|vidhyalay|academy|institute|college)\s*$/i, '')
    .trim()
    .toLowerCase();

/**
 * Modular Student Controller
 */
const studentController = {
  // Get all students
  getAll: async (req, res) => {
    try {
      const snapshot = await db.collection('students').get();
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Add a new student — auto-detect fee rule to set initial status
  // 'No Fee Set'  = red   (no matching fee rule found)
  // 'Pending Fee' = orange (rule found, no payment yet)
  // 'Active'      = green  (payment recorded — set by paymentController)
  create: async (req, res) => {
    try {
      const studentData = req.body;

      // Look up all fee rules and find the best match using normalized school name
      // Board match is preferred (score 2) but if student has no board, still match (score 1)
      const feesSnap = await db.collection('fees').get();
      const fees = feesSnap.docs.map(doc => doc.data());

      let matchingFee = null;
      let bestScore = 0;
      fees.forEach(f => {
        const schoolMatch = normalizeKey(f.school) === normalizeKey(studentData.school || '');
        const stdMatch    = String(f.standard).toLowerCase().trim() === String(studentData.standard).toLowerCase().trim();
        if (!schoolMatch || !stdMatch) return;

        const studentBoard = studentData.board?.toLowerCase().trim();
        const feeBoard     = f.board?.toLowerCase().trim();
        let score = 0;
        if (studentBoard && feeBoard && studentBoard === feeBoard) score = 2;
        else if (!studentBoard) score = 1;

        if (score > bestScore) { matchingFee = f; bestScore = score; }
      });

      const derivedMonthlyFee = matchingFee ? matchingFee.monthlyFee : (Number(studentData.monthlyFee) || 0);
      const initialStatus     = matchingFee ? 'Pending Fee' : 'No Fee Set';

      const docRef = await db.collection('students').add({
        ...studentData,
        monthlyFee: derivedMonthlyFee,
        status: initialStatus,
        createdAt: new Date(),
      });

      res.status(201).json({
        id: docRef.id,
        ...studentData,
        monthlyFee: derivedMonthlyFee,
        status: initialStatus,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update student details
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      await db.collection('students').doc(id).update(updateData);
      res.json({ message: 'Student updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete student record
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('students').doc(id).delete();
      res.json({ message: 'Student deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Normalize duplicate school names (e.g. "Zydus" + "Zydus School" → one canonical name)
  // Strategy: within each group sharing the same normalized key, pick the variant
  // used by the most students; on a tie, prefer the shorter name.
  normalizeSchools: async (req, res) => {
    try {
      const snapshot = await db.collection('students').get();
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Group by normalized key
      const groups = {};
      students.forEach(s => {
        if (!s.school) return;
        const key = normalizeKey(s.school);
        if (!groups[key]) groups[key] = {};
        groups[key][s.school] = (groups[key][s.school] || 0) + 1;
      });

      let updatedCount = 0;
      const batch = db.batch();

      for (const [, variants] of Object.entries(groups)) {
        const variantEntries = Object.entries(variants); // [[name, count], ...]
        if (variantEntries.length <= 1) continue; // no duplicates in this group

        // Pick canonical: most used; tie-break = shorter name
        const canonical = variantEntries.sort((a, b) =>
          b[1] - a[1] || a[0].length - b[0].length
        )[0][0];

        // Update every student NOT already using the canonical name
        students.forEach(s => {
          if (s.school && normalizeKey(s.school) === normalizeKey(canonical) && s.school !== canonical) {
            const ref = db.collection('students').doc(s.id);
            batch.update(ref, { school: canonical });
            updatedCount++;
          }
        });
      }

      if (updatedCount > 0) await batch.commit();
      res.json({ success: true, updatedCount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = studentController;
