const { db } = require('../config/firebase');
const { normalizeSchoolName } = require('../utils/normalization');

/**
 * Fee Controller
 * Manages fee structures keyed by School + Standard + Board.
 * On create/update, automatically propagates the monthlyFee to all matching students.
 */

/**
 * scoreFeeMatch — returns a match score for a student against a fee rule.
 *   2 = school + standard + board all match (best)
 *   1 = school + standard match but student has no board set (acceptable fallback)
 *   0 = no match
 */
const scoreFeeMatch = (student, fee) => {
  const studentNorm = normalizeSchoolName(student.school).canonical;
  const feeNorm = normalizeSchoolName(fee.school).canonical;
  
  const schoolMatch = studentNorm === feeNorm;
  const stdMatch    = String(student.standard).toLowerCase().trim() === String(fee.standard).toLowerCase().trim();
  if (!schoolMatch || !stdMatch) return 0;

  const studentBoard = student.board?.toLowerCase().trim();
  const feeBoard     = fee.board?.toLowerCase().trim();

  // Perfect match: boards are both present and equal
  if (studentBoard && feeBoard && studentBoard === feeBoard) return 2;
  // Fallback: student has no board set — still assign the fee
  if (!studentBoard) return 1;
  // Student has a board but it differs from the rule — no match
  return 0;
};

/**
 * findBestFee — given a student and a list of fee rules, return the best matching rule.
 * Prefers score=2 (exact board match) over score=1 (no board on student).
 */
const findBestFee = (student, fees) => {
  let best = null;
  let bestScore = 0;
  for (const fee of fees) {
    const score = scoreFeeMatch(student, fee);
    if (score > bestScore) { best = fee; bestScore = score; }
  }
  return best; // null if no match at all
};

const linkFeeToStudents = async (school, standard, board, monthlyFee) => {
  // Fetch both students and payments so we can determine true paid status
  const [studentsSnap, paymentsSnap] = await Promise.all([
    db.collection('students').get(),
    db.collection('payments').get(),
  ]);

  // Build set of studentIds who have at least one payment recorded
  const paidStudentIds = new Set(paymentsSnap.docs.map(d => d.data().studentId).filter(Boolean));

  const batch = db.batch();
  let count = 0;
  const feeRule = { school, standard, board };

  studentsSnap.docs.forEach(doc => {
    const d = doc.data();
    const score = scoreFeeMatch(d, feeRule);
    if (score > 0) {
      // Only mark Active if they actually have a recorded payment
      const trueStatus = paidStudentIds.has(doc.id) ? 'Active' : 'Pending Fee';
      batch.update(doc.ref, {
        monthlyFee: Number(monthlyFee),
        status: trueStatus,
        updatedAt: new Date(),
      });
      count++;
    }
  });

  if (count > 0) await batch.commit();
  return count;
};

const feeController = {
  // Get all fee structures
  getAll: async (req, res) => {
    try {
      const snapshot = await db.collection('fees').get();
      const fees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(fees);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create a fee structure and auto-assign monthlyFee to matching students
  create: async (req, res) => {
    try {
      const { school, standard, board, monthlyFee } = req.body;

      // Normalize school name for storage
      const normSchool = normalizeSchoolName(school).canonical;

      // Check for duplicate
      const existing = await db.collection('fees')
        .where('school', '==', normSchool)
        .where('standard', '==', standard)
        .where('board', '==', board)
        .get();

      if (!existing.empty) {
        return res.status(400).json({ error: 'A fee structure for this school / standard / board already exists. Use update instead.' });
      }

      const feeData = { school: normSchool, standard, board, monthlyFee: Number(monthlyFee), createdAt: new Date() };
      const docRef = await db.collection('fees').add(feeData);

      // Auto-link to matching students
      const studentsUpdated = await linkFeeToStudents(school, standard, board, monthlyFee);

      res.status(201).json({ id: docRef.id, ...feeData, studentsUpdated });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update fee structure and re-sync matching students
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const normSchool = normalizeSchoolName(school).canonical;
      const updateData = { school: normSchool, standard, board, monthlyFee: Number(monthlyFee), updatedAt: new Date() };
      await db.collection('fees').doc(id).update(updateData);

      // Re-link to matching students
      const studentsUpdated = await linkFeeToStudents(school, standard, board, monthlyFee);

      res.json({ message: 'Fee structure updated', studentsUpdated });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete fee structure
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('fees').doc(id).delete();
      res.json({ message: 'Fee structure deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Re-apply ALL existing fee rules to students (retroactive fix)
  // Uses actual payment records to determine true Active status —
  // so students who were default-set to 'Active' without paying get corrected to 'Pending Fee'.
  reApplyAll: async (req, res) => {
    try {
      const [feesSnap, studentsSnap, paymentsSnap] = await Promise.all([
        db.collection('fees').get(),
        db.collection('students').get(),
        db.collection('payments').get(),
      ]);

      const fees     = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Source of truth: a student is Active ONLY if they have a real payment recorded
      const paidStudentIds = new Set(
        paymentsSnap.docs.map(d => d.data().studentId).filter(Boolean)
      );

      const batch = db.batch();
      let totalUpdated = 0;
      const debugLog = [];

      students.forEach(s => {
        const matchingFee = findBestFee(s, fees);
        const ref = db.collection('students').doc(s.id);
        const hasPaid = paidStudentIds.has(s.id);

        if (matchingFee) {
          // Has a fee rule — status driven by payment history, not by stored status
          const trueStatus = hasPaid ? 'Active' : 'Pending Fee';
          batch.update(ref, {
            monthlyFee: Number(matchingFee.monthlyFee),
            status: trueStatus,
            updatedAt: new Date(),
          });
          totalUpdated++;
          debugLog.push({
            student: s.name,
            matched: `${matchingFee.school} · ${matchingFee.standard} · ${matchingFee.board}`,
            fee: matchingFee.monthlyFee,
            hasPaid,
            newStatus: trueStatus,
          });
        } else {
          // No matching fee rule
          if (s.status !== 'Inactive') {
            const trueStatus = hasPaid ? 'Active' : 'No Fee Set';
            batch.update(ref, { status: trueStatus, monthlyFee: 0, updatedAt: new Date() });
            totalUpdated++;
          }
          debugLog.push({ student: s.name, matched: null, hasPaid });
        }
      });

      if (totalUpdated > 0) await batch.commit();
      res.json({ success: true, totalUpdated, rulesApplied: fees.length, debugLog });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = feeController;
