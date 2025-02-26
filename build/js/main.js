// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
  getFirestore, 
  setDoc, 
  doc, 
  getDoc, getDocs, deleteDoc,
  collection, 
  addDoc, 
  connectFirestoreEmulator 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  connectAuthEmulator,
  updateProfile,
  sendEmailVerification,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js"
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-functions.js";

import { loadUserManagement } from "./components/user-management.js";
import { setupOrganizationForm } from "./components/organization-details.js";

let mUserOrgId = "";
let mOrganization = "";
let mUsers = "";

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
  const auth = getAuth();
  const functions = getFunctions(app);

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '1';
   
   if (isDevelopment) {
       connectFirestoreEmulator(db, 'localhost', 8080);
       connectAuthEmulator(auth, 'http://localhost:9099');
       connectFunctionsEmulator(functions, 'localhost', 5001);
   }

  const menuLinks = document.querySelectorAll(".menu a");

  menuLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const page = event.target.getAttribute("data-page");
      if(page != "sign-user-out"){
        loadPage(page, 
          db, 
          auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
          doc, setDoc, getDoc, getDocs, addDoc, collection, deleteDoc,
          functions, httpsCallable
        );
      }
    });
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      onSignInSuccess(auth);
      // Get the ID token result to access custom claims
      const idTokenResult = await user.getIdTokenResult();
      // Access the custom claims
      mUserOrgId = idTokenResult.claims.organizationId;

      if(mUserOrgId != null){
        // Fetch organization and users
        await fetchAllData(db, mUserOrgId, getDoc, getDocs);
      }else{
        console.log("User credential is null");
      }

      loadPage("user-management", db, 
        auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
        doc, setDoc, getDoc, getDocs, addDoc, collection, deleteDoc,
        functions, httpsCallable
      );
    } else {
      // User is signed out
      showSignInScreen(auth);
    }
  });
});


// Function to load the page content
async function loadPage(
  page, 
  db, 
  auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
  doc, setDoc, getDoc, getDocs, addDoc, collection, deleteDoc,
  functions, httpsCallable
) {
  const content = document.getElementById("content");

  // Load User Management screen
  if (page === "user-management") {

    const response = await fetch("html/user-management.html");
    const html = await response.text();
    content.innerHTML = html;
    loadUserManagement(
      db, 
      auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
      mUserOrgId, mUsers,
      doc, setDoc, deleteDoc,
      functions, httpsCallable,
      updateUserList
    );
  }

  // Load Organization Details screen
  if (page === "organization-details") {

    function updateOrganizationData(updatedOrg) {
      mOrganization = updatedOrg;
    }

    const response = await fetch("html/organization-details.html");
    const html = await response.text();
    content.innerHTML = html
    await setupOrganizationForm(db, addDoc, doc, getDoc, getDocs, setDoc, deleteDoc, collection, mOrganization, updateOrganizationData);
  }

  // Load Employee Hours screen
  if(page === "employee-hours"){
    const response = await fetch("html/employee-hours.html");
    const html = await response.text();
    content.innerHTML = html
  }

  // Load Approve Time Off screen
  if(page === "approve-time-off"){
    const response = await fetch("html/approve-time-off.html");
    const html = await response.text();
    content.innerHTML = html
  }
}

async function fetchAllData(db, organizationId, getDoc, getDocs) {

  try {
      // Fetch the organization data
      const orgDocRef = doc(db, `organizations/${organizationId}`);
      const orgDoc = await getDoc(orgDocRef);
      mOrganization = orgDoc.exists() ? { id: orgDoc.id, ...orgDoc.data() } : null;

      // Fetch the users for the organization
      const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
      mUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
      console.error('Error fetching organization and users:', error);
      return { organization: null, users: [] }; // Return default values on error
  }
}

function showSignInScreen(auth) {

  // Hide header and footer
  const header = document.getElementById("main_header");
  header.style.display = "none"

  const footer = document.getElementById("main_footer")
  footer.style.display = "none"

  const shadowDiv = document.getElementById("shadow");
  shadowDiv.style.display = "block";

  // Show sign in box
  const content = document.getElementById("content");
  content.innerHTML = signInHTML

  const form = document.getElementById('signin-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Handle form submission
  form.addEventListener('submit', async (event) => {
      event.preventDefault(); // Prevent form from submitting the traditional way
  
      const email = emailInput.value;
      const password = passwordInput.value;

      signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
          // Signed in 
          const user = userCredential.user;
          const userId = user.uid
      })
      .catch((error) => {
          const errorCode = error.code;
          let errorMessage = "An error occurred. Please try again.";
          switch (errorCode) {
              case "auth/invalid-email":
                  errorMessage = "Invalid email format.";
                  break;
              case "auth/wrong-password":
                  errorMessage = "Incorrect password.";
                  break;
              case "auth/user-not-found":
                  errorMessage = "No user found with that email.";
                  break;
              case "auth/invalid-credential":
                  errorMessage = "Email or password is incorrect";
                  break;
            // Add more cases as needed
          }

          console.log(errorMessage)
          document.getElementById("sign_in_error").innerHTML = errorMessage
      });

  });
}

function onSignInSuccess(auth){
  const header = document.getElementById("main_header");
  header.style.display = "block"

  const footer = document.getElementById("main_footer")
  footer.style.display = "block"

  const shadowDiv = document.getElementById("shadow");
  shadowDiv.style.display = "none";

  const signInContainer = document.getElementById("signin-container")
  if(signInContainer){
      signInContainer.style.display = "none"
  }

  const signOutLink = document.querySelector('[data-page="sign-user-out"]');
  signOutLink.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent the default anchor link behavior
      signOut(auth).then(() => {
          // Sign-out successful.
      }).catch((error) => {
          // An error happened.
      });
  });
}

function updateUserList(updatedUser){
  const existingUserIndex = mUsers.findIndex(user => user.id === updatedUser.id);
  if (existingUserIndex !== -1) {
      // Update existing user
      mUsers[existingUserIndex] = updatedUser;
  } else {
      // Add new user
      mUsers.push(updatedUser);
  }
}

const signInHTML = `
    <div id="signin-container">
      <div id="signin-form-div">
        <h2>Sign In</h2>
        <form id="signin-form">
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required>
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required>
        </div>
        <p id="sign_in_error"></p>
        <button id="signin_button" type="submit">Sign In</button>
        </form>
      </div>
    </div>
`