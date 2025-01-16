// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBoU1GNkg_4M6VmI53yTBqN2eZKxXRzTWs",
  authDomain: "timesheet-3b40b.firebaseapp.com",
  projectId: "timesheet-3b40b",
  storageBucket: "timesheet-3b40b.firebasestorage.app",
  messagingSenderId: "146957704760",
  appId: "1:146957704760:web:e55e81ad3304192fbe90cd",
  measurementId: "G-5VH5XQZ9J2"
};


document.addEventListener("DOMContentLoaded", () => {
  console.log("Timesheet Admin Portal Loaded!");
  // Initialize features or fetch initial data here
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  
});