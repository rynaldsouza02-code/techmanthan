const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

async function testConnection() {
  console.log("Attempting to connect to Firestore...");
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    console.log("Successfully connected to Firestore!");
    console.log(`Retrieved ${querySnapshot.size} events:`);
    querySnapshot.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.data().title}`);
    });
  } catch (error) {
    console.error("Firestore connection failed:", error);
  }
}

testConnection();
