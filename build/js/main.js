// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js";
import { getFirestore, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js"
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
  const db = getFirestore(app);
  const analytics = getAnalytics(app);

  const menuLinks = document.querySelectorAll(".menu a");

  menuLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const page = event.target.getAttribute("data-page");
      if(page != "sign-user-out"){
        loadPage(page);
        console.log("loading page " + page)
      }
    });
  });

  fetchAllData(db)
});

// Define the content for each page
const pages = {
  "user-management": `
    <h2>User Management</h2>
    <p>Manage users, add new users, and update user details.</p>
  `,
  "organization-details": `
    <h2>Organization Details</h2>
    <p>View and update organization settings like pay period start day and duration.</p>
  `,
  "employee-hours": `
    <h2>Employee Hours</h2>
    <p>View employee hours and see who has confirmed their timesheets.</p>
  `,
  "approve-time-off": `
    <h2>Approve Time Off</h2>
    <p>Approve or reject pending time-off requests.</p>
  `,
};

// Function to load the page content
function loadPage(page) {
  const content = document.getElementById("content");
  content.innerHTML = pages[page] || `<h2>Page Not Found</h2>`;
}

async function fetchAllData(db) {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const orgSnapshot = await getDocs(collection(db, "organizations"));
  const organizations = orgSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return { users, organizations };
}