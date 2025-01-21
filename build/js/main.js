// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { loadUserManagement } from "./components/user-management.js";
import { setupOrganizationForm } from "./components/organization-details.js";

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

  const menuLinks = document.querySelectorAll(".menu a");

  menuLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const page = event.target.getAttribute("data-page");
      if(page != "sign-user-out"){
        loadPage(page, db);
      }
    });
  });

  // fetchAllData(db)
});


// Function to load the page content
async function loadPage(page, db) {
  const content = document.getElementById("content");

  // Load User Management screen
  if (page === "user-management") {
    const response = await fetch("build/html/user-management.html");
    const html = await response.text();
    content.innerHTML = html;
    loadUserManagement(db);
  }

  // Load Organization Details screen
  if (page === "organization-details") {
    const response = await fetch("build/html/organization-details.html");
    const html = await response.text();
    content.innerHTML = html
    setupOrganizationForm(db);
  }

  // Load Employee Hours screen
  if(page === "employee-hours"){
    const response = await fetch("build/html/employee-hours.html");
    const html = await response.text();
    content.innerHTML = html
  }

  // Load Approve Time Off screen
  if(page === "approve-time-off"){
    const response = await fetch("build/html/approve-time-off.html");
    const html = await response.text();
    content.innerHTML = html
  }
}

// async function fetchAllData(db) {
//   const usersSnapshot = await getDocs(collection(db, "users"));
//   const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//   const orgSnapshot = await getDocs(collection(db, "organizations"));
//   const organizations = orgSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//   return { users, organizations };
// }