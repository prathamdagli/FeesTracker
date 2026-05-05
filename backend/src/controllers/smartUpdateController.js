const { db } = require('../config/firebase');
const xlsx = require('xlsx');
const { normalizeSchoolName } = require('../utils/normalization');

/**
 * Flexible column finder — strips spaces/special chars before comparing.
 * Tries every candidate against every actual row key.
 */
const findCol = (row, ...candidates) => {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const norm = candidate.toLowerCase().replace(/[\s'\/\-.()]/g, '');
    const match = rowKeys.find(k => k.toLowerCase().replace(/[\s'\/\-.()]/g, '') === norm);
    if (match !== undefined && row[match] !== undefined && String(row[match]).trim() !== '') {
      return row[match];
    }
  }
  return undefined;
};

const parseDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date
    const d = xlsx.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  return String(val).trim();
};

const smartUpdateController = {

  /** Debug: see raw headers + first 3 rows exactly as xlsx reads them */
  debug: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      res.json({
        sheetName,
        totalRows: rawRows.length,
        headers: rawRows.length > 0 ? Object.keys(rawRows[0]) : [],
        firstThreeRows: rawRows.slice(0, 3),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /** Preview: parse Excel, compare with Firestore, classify records */
  preview: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
      }

      const detectedHeaders = Object.keys(rows[0]);

      // Existing students keyed by name (lowercase)
      const snapshot = await db.collection('students').get();
      const existingStudents = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) existingStudents[data.name.toLowerCase().trim()] = { id: doc.id, ...data };
      });

      const newRecords = [];
      const updatedRecords = [];
      const unchangedRecords = [];
      const skippedRows = [];

      rows.forEach((row, idx) => {
        // ── Core identity fields ──────────────────────────────────────────
        const name = findCol(row,
          'Name of the Student', 'Name', 'Student Name', 'StudentName',
          'Full Name', 'FullName', 'STUDENT', 'student'
        );

        if (!name || String(name).trim() === '') {
          skippedRows.push({ rowIndex: idx + 2, reason: 'Missing student name', rawData: row });
          return;
        }

        const standard = findCol(row,
          'Grade / Standard', 'Grade/Standard', 'Standard', 'Class',
          'Std', 'Grade', 'Year', 'STD', 'GradeStandard'
        );
        const school = findCol(row,
          'School Name', 'School', 'SchoolName', 'Institute', 'College'
        );
        const board = findCol(row,
          'Board', 'board', 'BOARD', 'curriculum', 'Curriculum'
        );
        const monthlyFee = findCol(row,
          'Monthly Fee', 'MonthlyFee', 'Fee', 'Fees', 'Amount', 'FEES', 'monthly_fee'
        );
        const status = findCol(row, 'Status', 'STATUS', 'Active');

        // ── Contact & personal fields (Google Forms columns) ─────────────
        const dob = findCol(row,
          'Date of Birth', 'DateofBirth', 'DOB', 'Birth Date', 'Birthdate'
        );
        const fatherName = findCol(row,
          "Father's Name", 'FathersName', 'Father Name', 'FatherName', 'father'
        );
        const fatherMobile = findCol(row,
          "Father's Mobile Number", 'FathersMobileNumber', "Father's Mobile",
          'FatherMobile', 'FatherPhone', 'father mobile'
        );
        const motherName = findCol(row,
          "Mother's Name", 'MothersName', 'Mother Name', 'MotherName', 'mother'
        );
        const motherMobile = findCol(row,
          "Mother's Mobile Number", 'MothersMobileNumber', "Mother's Mobile",
          'MotherMobile', 'MotherPhone', 'mother mobile'
        );
        const address = findCol(row,
          'Residential Address', 'Address', 'ResidentialAddress', 'residence',
          'Home Address', 'HomeAddress'
        );
        const email = findCol(row,
          'Email Address (Student or Parent)', 'EmailAddress', 'Email',
          'email', 'Email Address', 'Parent Email'
        );
        const timestamp = findCol(row, 'Timestamp', 'timestamp', 'submitted', 'Submitted At');

        // ── Normalise ─────────────────────────────────────────────────────
        // Note: board is optional — fee matching is by school + standard only
        const schoolInfo = normalizeSchoolName(school || '');
        
        const normalized = {
          name:         String(name).trim(),
          school:       schoolInfo.canonical,
          standard:     String(standard || '').trim(),
          ...(board ? { board: String(board).trim() } : {}),
          // monthlyFee from Excel is treated as a hint; actual fee comes from Fee Structure rules
          ...(monthlyFee ? { monthlyFeeHint: Number(String(monthlyFee).replace(/[^0-9.]/g, '')) || 0 } : {}),
          dob:          parseDate(dob),
          fatherName:   String(fatherName   || '').trim(),
          fatherMobile: String(fatherMobile || '').trim(),
          motherName:   String(motherName   || '').trim(),
          motherMobile: String(motherMobile || '').trim(),
          address:      String(address  || '').trim(),
          email:        String(email    || '').trim(),
          submittedAt:  String(timestamp || '').trim(),
        };

        // Remove empty string keys so we don't overwrite good data with ''
        Object.keys(normalized).forEach(k => {
          if (normalized[k] === '' || normalized[k] === null || normalized[k] === undefined) delete normalized[k];
        });
        // Never store monthlyFeeHint — it's used during commit, not persisted
        // (fee is resolved from Fee Structure rules during commit)

        const existing = existingStudents[normalized.name.toLowerCase()];

        if (!existing) {
          newRecords.push(normalized);
        } else {
          const hasChanges =
            (normalized.school       && existing.school       !== normalized.school)       ||
            (normalized.standard     && existing.standard     !== normalized.standard)     ||
            (normalized.fatherMobile && existing.fatherMobile !== normalized.fatherMobile) ||
            (normalized.motherMobile && existing.motherMobile !== normalized.motherMobile) ||
            (normalized.email        && existing.email        !== normalized.email)        ||
            (normalized.address      && existing.address      !== normalized.address)      ||
            (normalized.dob          && existing.dob          !== normalized.dob);

          if (hasChanges) {
            updatedRecords.push({ ...normalized, id: existing.id });
          } else {
            unchangedRecords.push({ ...normalized, id: existing.id });
          }
        }
      });

      res.json({
        summary: {
          total: rows.length,
          new: newRecords.length,
          updated: updatedRecords.length,
          unchanged: unchangedRecords.length,
          skipped: skippedRows.length,
        },
        detectedHeaders,
        newRecords,
        updatedRecords,
        unchangedRecords,
        skippedRows,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /** Commit previewed changes to Firestore in a batch.
   * Resolves monthlyFee and status from Fee Structure rules (school+standard match, no board required).
   * New students without a matching fee rule → 'No Fee Set'.
   * New students with a matching fee rule    → 'Pending Fee' + fee from rule.
   * Updated students: only contact/personal info is updated; status and fee are re-evaluated if they have no payment.
   */
  commit: async (req, res) => {
    try {
      const { newRecords = [], updatedRecords = [] } = req.body;
      if (newRecords.length === 0 && updatedRecords.length === 0) {
        return res.json({ message: 'Nothing to commit', count: 0 });
      }

      // Load fee rules and payments for status determination
      const [feesSnap, paymentsSnap] = await Promise.all([
        db.collection('fees').get(),
        db.collection('payments').get(),
      ]);
      const fees = feesSnap.docs.map(d => d.data());
      const paidStudentIds = new Set(paymentsSnap.docs.map(d => d.data().studentId).filter(Boolean));

      // Find best fee rule for a student: school+standard match (board optional)
      const findFee = (school, standard, board) => {
        let best = null, bestScore = 0;
        const normSchool = normalizeSchoolName(school).canonical;
        
        fees.forEach(f => {
          const fNormSchool = normalizeSchoolName(f.school).canonical;
          const schoolOk = fNormSchool === normSchool;
          const stdOk    = String(f.standard).toLowerCase().trim() === String(standard).toLowerCase().trim();
          if (!schoolOk || !stdOk) return;
          const sBoard = board?.toLowerCase().trim();
          const fBoard = f.board?.toLowerCase().trim();
          let score = (!sBoard) ? 1 : (sBoard === fBoard ? 2 : 0);
          if (score > bestScore) { best = f; bestScore = score; }
        });
        return best;
      };

      const batch = db.batch();
      let count = 0;

      newRecords.forEach(item => {
        const { monthlyFeeHint, ...data } = item; // strip the hint field
        const rule = findFee(data.school, data.standard, data.board);
        const monthlyFee = rule ? rule.monthlyFee : (monthlyFeeHint || 0);
        const status     = rule ? 'Pending Fee' : 'No Fee Set';

        const docRef = db.collection('students').doc();
        batch.set(docRef, { ...data, monthlyFee, status, createdAt: new Date() });
        count++;
      });

      updatedRecords.forEach(item => {
        if (!item.id) return;
        const { id, monthlyFeeHint, ...data } = item;
        const docRef = db.collection('students').doc(id);

        // Re-evaluate fee + status for updated students (unless they've paid)
        const rule = findFee(data.school, data.standard, data.board);
        const updates = { ...data, updatedAt: new Date() };
        if (rule) {
          updates.monthlyFee = rule.monthlyFee;
          if (!paidStudentIds.has(id)) updates.status = 'Pending Fee';
        } else if (!paidStudentIds.has(id)) {
          updates.status = 'No Fee Set';
          updates.monthlyFee = 0;
        }

        batch.update(docRef, updates);
        count++;
      });

      await batch.commit();
      res.json({ message: `Successfully committed ${count} records to Firestore`, count });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = smartUpdateController;
