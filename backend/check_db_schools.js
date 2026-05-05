const { db } = require('./src/config/firebase');

async function checkData() {
  try {
    const studentsSnap = await db.collection('students').get();
    const feesSnap = await db.collection('fees').get();

    const studentSchools = new Set();
    studentsSnap.docs.forEach(doc => studentSchools.add(doc.data().school));

    const feeSchools = new Set();
    feesSnap.docs.forEach(doc => feeSchools.add(doc.data().school));

    console.log('--- Schools in Students Collection ---');
    console.log(Array.from(studentSchools));
    
    console.log('\n--- Schools in Fees Collection ---');
    console.log(Array.from(feeSchools));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
