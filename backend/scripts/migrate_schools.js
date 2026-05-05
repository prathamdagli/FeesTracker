const { db } = require('../src/config/firebase');
const { normalizeSchoolName } = require('../src/utils/normalization');

async function migrate() {
  console.log('--- Starting School Name Migration ---');
  
  try {
    const [studentsSnap, feesSnap] = await Promise.all([
      db.collection('students').get(),
      db.collection('fees').get()
    ]);

    const batch = db.batch();
    let studentCount = 0;
    let feeCount = 0;

    console.log(`Processing ${studentsSnap.size} students...`);
    studentsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!data.school) return;
      
      const norm = normalizeSchoolName(data.school);
      if (data.school !== norm.canonical) {
        batch.update(doc.ref, { 
          school: norm.canonical,
          updatedAt: new Date()
        });
        studentCount++;
        console.log(`  [Student] "${data.school}" -> "${norm.canonical}"`);
      }
    });

    console.log(`Processing ${feesSnap.size} fee structures...`);
    feesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!data.school) return;

      const norm = normalizeSchoolName(data.school);
      if (data.school !== norm.canonical) {
        batch.update(doc.ref, { 
          school: norm.canonical,
          updatedAt: new Date()
        });
        feeCount++;
        console.log(`  [Fee] "${data.school}" -> "${norm.canonical}"`);
      }
    });

    if (studentCount > 0 || feeCount > 0) {
      await batch.commit();
      console.log(`\nMigration complete. Updated ${studentCount} students and ${feeCount} fees.`);
    } else {
      console.log('\nNo records needed normalization.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  process.exit(0);
}

migrate();
