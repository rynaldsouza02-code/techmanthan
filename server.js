const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, deleteDoc } = require('firebase/firestore');

const app = express();
const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tech_manthana';

const firebaseConfig = {
  apiKey: "AIzaSyC2maKwjtoad-DSd3_wQLSKPZbKmigqh1Q",
  authDomain: "techmanthana.firebaseapp.com",
  projectId: "techmanthana",
  storageBucket: "techmanthana.firebasestorage.app",
  messagingSenderId: "840190662351",
  appId: "1:840190662351:web:9f7fbf05da27636216c9ba"
};

let fbDb = null;
try {
  const fbApp = initializeApp(firebaseConfig);
  fbDb = getFirestore(fbApp);
  console.log('✅ Firebase initialized as async backup engine');
} catch (err) {
  console.error('Firebase backup init warning:', err.message);
}

// Non-blocking Firebase sync helper
function syncToFirebase(collectionName, docId, data, isDelete = false) {
  if (!fbDb || !collectionName || !docId) return;
  setImmediate(async () => {
    try {
      const docRef = doc(fbDb, collectionName, String(docId));
      if (isDelete) {
        await deleteDoc(docRef);
        console.log(`[Firebase Backup] Deleted ${collectionName}/${docId}`);
      } else {
        const cleanData = JSON.parse(JSON.stringify(data));
        delete cleanData._id;
        await setDoc(docRef, cleanData, { merge: true });
        console.log(`[Firebase Backup] Synced ${collectionName}/${docId}`);
      }
    } catch (err) {
      console.error(`[Firebase Backup Warning] ${collectionName}/${docId}:`, err.message);
    }
  });
}

// Full background sync from MongoDB to Firebase
async function runFullFirebaseBackup() {
  if (!fbDb) return;
  try {
    const collections = ['events', 'organizers', 'studentCoordinators', 'students', 'announcements', 'judges', 'scores', 'registrations', 'promos'];
    for (const collName of collections) {
      const Model = getModel(collName);
      const docs = await Model.find({}).lean();
      for (const d of docs) {
        const docId = String(d.id || d._id);
        if (docId) {
          syncToFirebase(collName, docId, d);
        }
      }
    }
    console.log('☁️ Full background database sync to Firebase started...');
  } catch (err) {
    console.error('Firebase full sync error:', err.message);
  }
}

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
  }
  next();
});

// Ensure Vedios directory exists and serve it statically
const vediosDir = path.join(__dirname, 'Vedios');
if (!fs.existsSync(vediosDir)) {
  fs.mkdirSync(vediosDir, { recursive: true });
}
app.use('/Vedios', express.static(vediosDir));

// Video / Media Upload Endpoint Handler
function handleMediaUpload(req, res) {
  console.log('📹 RECEIVED MEDIA UPLOAD REQUEST:', req.method, req.url);
  try {
    if (!fs.existsSync(vediosDir)) {
      fs.mkdirSync(vediosDir, { recursive: true });
    }

    let fileName = req.body.fileName || `video_${Date.now()}.mp4`;
    fileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!path.extname(fileName)) fileName += '.mp4';

    let buffer;
    if (req.body.fileData) {
      let base64Data = req.body.fileData;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      buffer = Buffer.from(base64Data, 'base64');
    } else if (req.body.buffer) {
      buffer = Buffer.from(req.body.buffer);
    } else {
      return res.status(400).json({ error: 'No video or media data received.' });
    }

    const targetPath = path.join(vediosDir, fileName);
    fs.writeFileSync(targetPath, buffer);
    console.log(`📹 Video saved to local storage: Vedios/${fileName} (${buffer.length} bytes)`);

    const mediaUrl = `/Vedios/${fileName}`;
    res.json({ success: true, url: mediaUrl, mediaUrl: mediaUrl, fileName: fileName });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/upload-video', handleMediaUpload);
app.post('/api/upload-media', handleMediaUpload);

// Connect to MongoDB via Mongoose
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB via Mongoose:', MONGO_URI);
    seedInitialData();
    // Run initial full backup 15s after startup
    setTimeout(runFullFirebaseBackup, 15000);
  })
  .catch(err => {
    console.error('❌ Mongoose connection error:', err.message);
  });

// Run full background backup every 10 minutes
setInterval(runFullFirebaseBackup, 10 * 60 * 1000);

// Dynamic Mongoose model factory
function parseUpdateBody(body) {
  const mongoUpdate = {};
  const setObj = {};
  const addToSetObj = {};
  const pullObj = {};
  const incObj = {};

  for (const [key, value] of Object.entries(body)) {
    if (key === "merge" || key === "_id") continue;
    if (value && typeof value === "object" && value.__op) {
      if (value.__op === "arrayUnion") {
        addToSetObj[key] = { $each: value.elements || [] };
      } else if (value.__op === "arrayRemove") {
        pullObj[key] = { $in: value.elements || [] };
      } else if (value.__op === "increment") {
        incObj[key] = value.value || 0;
      }
    } else {
      setObj[key] = value;
    }
  }

  if (Object.keys(setObj).length > 0) mongoUpdate["$set"] = setObj;
  if (Object.keys(addToSetObj).length > 0) mongoUpdate["$addToSet"] = addToSetObj;
  if (Object.keys(pullObj).length > 0) mongoUpdate["$pull"] = pullObj;
  if (Object.keys(incObj).length > 0) mongoUpdate["$inc"] = incObj;

  return mongoUpdate;
}

const modelsMap = {};
function getModel(collectionName) {
  const name = collectionName.toLowerCase().trim();
  if (!modelsMap[name]) {
    const schema = new mongoose.Schema({
      _id: { type: String },
      id: { type: String }
    }, { strict: false, timestamps: true, versionKey: false });
    modelsMap[name] = mongoose.models[name] || mongoose.model(name, schema, name);
  }
  return modelsMap[name];
}

// Seed initial JSON data from ./Data directory into MongoDB if empty
async function seedInitialData() {
  try {
    const dataDir = path.join(__dirname, 'Data');
    if (!fs.existsSync(dataDir)) return;
    
    let backupObj = null;
    const backupPath = path.join(dataDir, 'full_database_backup.json');
    if (fs.existsSync(backupPath)) {
      try {
        backupObj = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      } catch (e) {}
    }

    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      if (file === 'full_database_backup.json') continue;
      const collName = path.basename(file, '.json');
      const Model = getModel(collName);
      const count = await Model.countDocuments();
      
      if (count === 0) {
        const filePath = path.join(dataDir, file);
        const raw = fs.readFileSync(filePath, 'utf8');
        let items = [];
        try {
          items = JSON.parse(raw);
        } catch (e) {}

        if ((!Array.isArray(items) || items.length === 0) && backupObj && backupObj.database && Array.isArray(backupObj.database[collName])) {
          items = backupObj.database[collName];
        }

        if (Array.isArray(items) && items.length > 0) {
          const docsToInsert = items.map((item, idx) => {
            const docId = String(item.id || item._id || item.username || item.rollNo || item.regNo || (item.sno ? collName + '_' + item.sno + '_' + idx : idx + 1));
            return { ...item, _id: docId, id: docId };
          });
          await Model.insertMany(docsToInsert, { ordered: false }).catch(() => {});
          console.log(`🌱 Seeded ${docsToInsert.length} documents into MongoDB collection: ${collName}`);
        }
      }
    }

    // Ensure promos collection is seeded if empty
    const PromosModel = getModel('promos');
    const promosCount = await PromosModel.countDocuments();
    if (promosCount === 0) {
      const defaultPromo = {
        _id: "promo_whatsapp_video",
        id: "promo_whatsapp_video",
        title: "Tech Manthan 6.0 Official Teaser",
        description: "Experience the ultimate technology festival - Tech Manthan 6.0",
        contentType: "video",
        mediaSource: "file",
        mediaUrl: "/Vedios/WhatsApp Video 2026-08-07 at 5.15.22 PM.mp4",
        targetVisibility: "explore",
        priority: 10,
        uploadedBy: "Administrator",
        uploadedByRole: "admin",
        createdAt: new Date().toISOString()
      };
      await PromosModel.create(defaultPromo).catch(() => {});
      console.log('🌱 Seeded default promo video into MongoDB collection: promos');
    }

  } catch (err) {
    console.error('Data seeding warning:', err.message);
  }
}

// Helper: Normalize document fields to guarantee array structures
function normalizeDoc(doc) {
  if (!doc) return doc;
  if (doc.registeredEvents) {
    if (Array.isArray(doc.registeredEvents)) {
      doc.registeredEvents = doc.registeredEvents.filter(ev => typeof ev === 'string');
    } else if (typeof doc.registeredEvents === 'object' && doc.registeredEvents.__op === 'arrayUnion') {
      doc.registeredEvents = Array.isArray(doc.registeredEvents.elements) ? doc.registeredEvents.elements : [];
    } else {
      doc.registeredEvents = [];
    }
  }
  return doc;
}

// Helper: Build MongoDB update query supporting atomic operators
function buildMongoUpdate(body, docId) {
  const updateQuery = {};
  const setObj = {};
  const addToSetObj = {};
  const pullObj = {};
  const incObj = {};

  const cleanedBody = { ...body };
  delete cleanedBody.merge;

  for (const [key, val] of Object.entries(cleanedBody)) {
    if (val && typeof val === 'object' && val.__op) {
      if (val.__op === 'arrayUnion') {
        const elements = Array.isArray(val.elements) ? val.elements : [];
        if (elements.length === 1) {
          addToSetObj[key] = elements[0];
        } else if (elements.length > 1) {
          addToSetObj[key] = { $each: elements };
        }
      } else if (val.__op === 'arrayRemove') {
        const elements = Array.isArray(val.elements) ? val.elements : [];
        if (elements.length === 1) {
          pullObj[key] = elements[0];
        } else if (elements.length > 1) {
          pullObj[key] = { $in: elements };
        }
      } else if (val.__op === 'increment') {
        incObj[key] = Number(val.value) || 0;
      }
    } else {
      setObj[key] = val;
    }
  }

  if (docId) {
    setObj._id = docId;
    setObj.id = docId;
  }

  if (Object.keys(setObj).length > 0) updateQuery.$set = setObj;
  if (Object.keys(addToSetObj).length > 0) updateQuery.$addToSet = addToSetObj;
  if (Object.keys(pullObj).length > 0) updateQuery.$pull = pullObj;
  if (Object.keys(incObj).length > 0) updateQuery.$inc = incObj;

  return updateQuery;
}

// MongoDB API Routes
app.get('/api/health', async (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ status: state === 1 ? 'connected' : 'disconnected', readyState: state, firebaseBackup: !!fbDb });
});

app.get('/api/db/:collection', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const docs = await Model.find({}).lean();
    res.json(docs.map(d => normalizeDoc(d)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const doc = await Model.findOne({ _id: req.params.id }).lean();
    res.json(doc ? normalizeDoc(doc) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const docId = req.params.id;
    const updateQuery = buildMongoUpdate(req.body || {}, docId);
    
    const result = await Model.findOneAndUpdate(
      { _id: docId },
      updateQuery,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();

    const normalized = normalizeDoc(result);
    res.json(normalized);
    // Async Firebase Backup
    syncToFirebase(req.params.collection, docId, normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/:collection', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const body = req.body || {};
    const docId = String(body.id || body._id || new mongoose.Types.ObjectId().toString());
    const updateQuery = buildMongoUpdate(body, docId);

    const result = await Model.findOneAndUpdate(
      { _id: docId },
      updateQuery,
      { upsert: true, returnDocument: 'after' }
    ).lean();

    const normalized = normalizeDoc(result);
    res.json(normalized);
    // Async Firebase Backup
    syncToFirebase(req.params.collection, docId, normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/db/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const docId = req.params.id;
    const updateQuery = buildMongoUpdate(req.body || {}, docId);

    const result = await Model.findOneAndUpdate(
      { _id: docId },
      updateQuery,
      { returnDocument: 'after' }
    ).lean();

    const normalized = normalizeDoc(result);
    res.json(normalized);
    // Async Firebase Backup
    syncToFirebase(req.params.collection, docId, normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/db/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const docId = req.params.id;
    await Model.deleteOne({ _id: docId });
    res.json({ success: true });
    // Async Firebase Backup
    syncToFirebase(req.params.collection, docId, null, true);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db-query/:collection', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const filters = req.body.filters || [];
    const query = {};
    filters.forEach(f => {
      if (f.op === '==' || f.op === '=') {
        query[f.field] = f.value;
      } else if (f.op === 'in') {
        const inObj = {};
        inObj['$in'] = f.value;
        query[f.field] = inObj;
      } else if (f.op === 'array-contains') {
        query[f.field] = f.value;
      }
    });
    const docs = await Model.find(query).lean();
    res.json(docs.map(d => normalizeDoc(d)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Custom MIME Types map
const mimeMap = {
  '.html': 'text/html; charset=UTF-8',
  '.htm': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Handle /api/send-email endpoint
app.all('/api/send-email', async (req, res) => {
  try {
    const sendEmailHandler = require('./api/send-email.js');
    await sendEmailHandler(req, res);
  } catch (err) {
    console.error('Error handling /api/send-email:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Rewrites from vercel.json: /j/:event -> judge.html
app.get('/j/:event', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.sendFile(path.join(__dirname, 'judge.html'));
});

// Serve static files with explicit Content-Type headers
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeMap[ext]) {
      res.setHeader('Content-Type', mimeMap[ext]);
    }
    res.removeHeader('Content-Disposition');
  }
}));

app.get('/favicon.ico', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.join(__dirname, 'TC1.png'));
});

// Default fallback to index.html
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Tech Manthan 6.0 Dev Server running at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}\n`);
});
