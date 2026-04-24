import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Global flag
window.firebaseReadyFlag = false;

// Initialize Firebase immediately
(async () => {
  console.log("Firebase: Initializing on page load...");
  let app;
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    const db = getFirestore(app);
    
    // Set globals for non-module scripts
    window.firebase_app = app;
    window.firebase_db = db;
    window.firestore = { collection, addDoc, serverTimestamp };
    
    try {
      getAnalytics(app);
    } catch (e) {
      console.warn("Analytics error:", e.message);
    }

    window.firebaseReadyFlag = true;
    console.log("Firebase: Ready flag set to true.");
    
    // Also keep the promise for internal use if needed
    if (window.resolveFirebase) window.resolveFirebase();
    
  } catch (error) {
    console.error("Firebase: Initialization failed!", error);
  }
})();

export { firebaseConfig };
