import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBalfKQWpa3eBhwtKnRrkQ3bVC7V0WEw0",
  authDomain: "pickles-6349b.firebaseapp.com",
  projectId: "pickles-6349b",
  storageBucket: "pickles-6349b.firebasestorage.app",
  messagingSenderId: "167052303149",
  appId: "1:167052303149:web:98ed99a51fa4690b4dd1a4",
  measurementId: "G-QHF24HD7EY"
};

// Global readiness flag
window.firebaseReadyFlag = false;

// Initialize Firebase immediately on page load
(async () => {
  try {
    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    const db = getFirestore(app);
    
    // Set globals for app.js
    window.firebase_app = app;
    window.firebase_db = db;
    window.firestore = { collection, addDoc, serverTimestamp };
    
    try {
      window.firebase_analytics = getAnalytics(app);
    } catch (e) {
      // Silent fail for analytics
    }

    window.firebaseReadyFlag = true;
    console.log("Firebase: Connected");
  } catch (error) {
    // Silent fail as requested: "Do NOT show any Firebase loading errors"
    console.warn("Firebase: Delayed initialization");
  }
})();
