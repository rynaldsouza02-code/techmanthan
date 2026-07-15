import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2maKwjtoad-DSd3_wQLSKPZbKmigqh1Q",
  authDomain: "techmanthana.firebaseapp.com",
  projectId: "techmanthana",
  storageBucket: "techmanthana.firebasestorage.app",
  messagingSenderId: "840190662351",
  appId: "1:840190662351:web:9f7fbf05da27636216c9ba"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

export { db };