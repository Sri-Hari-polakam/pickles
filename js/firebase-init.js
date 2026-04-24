import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXHP6CgHNOVavHfXO3YukRO5TXbyqUGT8",
  authDomain: "saahnasa-dc137.firebaseapp.com",
  projectId: "saahnasa-dc137",
  storageBucket: "saahnasa-dc137.firebasestorage.app",
  messagingSenderId: "485640400638",
  appId: "1:485640400638:web:87386ae2c9eefff3c2bfaf",
  measurementId: "G-19LBSBNPFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

console.log("Firebase initialized successfully");

export { app, analytics, db };
