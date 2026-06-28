const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function check() {
  try {
    const orgsColl = collection(db, "organizers");
    const orgsSnap = await getDocs(orgsColl);
    console.log("Total Organizers in Firestore:", orgsSnap.size);
    orgsSnap.forEach(d => {
      console.log(`- ${d.id}: ${JSON.stringify(d.data())}`);
    });
    
    const eventsColl = collection(db, "events");
    const eventsSnap = await getDocs(eventsColl);
    console.log("Total Events in Firestore:", eventsSnap.size);
    eventsSnap.forEach(d => {
      console.log(`- ${d.id}: ${d.data().title} (Coordinator: ${d.data().coordinator})`);
    });
    
    const studentsColl = collection(db, "students");
    const studentsSnap = await getDocs(studentsColl);
    console.log("Total Students in Firestore:", studentsSnap.size);
    studentsSnap.forEach(d => {
      console.log(`- ${d.id}: ${JSON.stringify(d.data())}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error connecting to Firestore:", err);
    process.exit(1);
  }
}

check();
