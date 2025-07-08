// module-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDgGaOi-lNe9vNg72fNag1C6hioB2qqnMU",
  authDomain: "service-prepareing.firebaseapp.com",
  projectId: "service-prepareing",
  storageBucket: "service-prepareing.firebasestorage.app",
  messagingSenderId: "295345065007",
  appId: "1:295345065007:web:0eb9463c2f0b73ff4b4ada",
  measurementId: "G-W68Y5N8TLD"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

console.log("✅ Firebase initialized.");
