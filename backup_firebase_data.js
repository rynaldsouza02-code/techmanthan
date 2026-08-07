const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2maKwjtoad-DSd3_wQLSKPZbKmigqh1Q",
  authDomain: "techmanthana.firebaseapp.com",
  projectId: "techmanthana",
  storageBucket: "techmanthana.firebasestorage.app",
  messagingSenderId: "840190662351",
  appId: "1:840190662351:web:9f7fbf05da27636216c9ba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All collections in Firestore
const targetCollections = [
  "events",
  "organizers",
  "students",
  "studentCoordinators",
  "promoMedia",
  "announcements",
  "judges",
  "users"
];

async function runBackup() {
  console.log("==================================================");
  console.log("🚀 STARTING FIREBASE DATA BACKUP — TECH MANTHAN 6.0");
  console.log("==================================================\n");

  const outputDir = path.join(__dirname, "Data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created backup directory: "${outputDir}"\n`);
  }

  const backupMetadata = {
    backupDate: new Date().toISOString(),
    backupTimestamp: Date.now(),
    projectId: firebaseConfig.projectId,
    collectionsSummary: {},
    database: {}
  };

  for (const colName of targetCollections) {
    try {
      console.log(`🔍 Backing up collection: "${colName}"...`);
      const querySnap = await getDocs(collection(db, colName));
      const documents = [];

      querySnap.forEach(docSnap => {
        documents.push({
          _id: docSnap.id,
          ...docSnap.data()
        });
      });

      // Save individual collection JSON file
      const filePath = path.join(outputDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf-8');

      backupMetadata.collectionsSummary[colName] = documents.length;
      backupMetadata.database[colName] = documents;

      console.log(`  ✅ Successfully exported ${documents.length} document(s) -> Data/${colName}.json`);
    } catch (err) {
      console.error(`  ❌ Failed to backup collection "${colName}":`, err.message);
      backupMetadata.collectionsSummary[colName] = `ERROR: ${err.message}`;
    }
  }

  // Save master combined backup JSON
  const masterBackupPath = path.join(outputDir, "full_database_backup.json");
  fs.writeFileSync(masterBackupPath, JSON.stringify(backupMetadata, null, 2), 'utf-8');
  console.log(`\n📦 Master backup file saved -> Data/full_database_backup.json`);

  console.log("\n==================================================");
  console.log("📊 BACKUP SUMMARY");
  console.log("==================================================");
  console.table(backupMetadata.collectionsSummary);
  console.log("==================================================");
  console.log("✨ ALL FIREBASE DATA BACKUP COMPLETED SUCCESSFULLY!\n");
}

runBackup().catch(err => {
  console.error("Critical error during backup:", err);
  process.exit(1);
});
