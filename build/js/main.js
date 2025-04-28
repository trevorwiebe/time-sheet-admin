// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
  getFirestore, 
  setDoc, 
  doc, 
  getDoc, getDocs, deleteDoc,
  collection, 
  addDoc, 
  connectFirestoreEmulator,
  query,
  where
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
import { loadUsers } from "./components/employee-hours.js";
import { convertToISOString } from "./utils/employee-utils.js";
import { loadTimeOffUsers } from "./components/time-off-requests.js";

let mUserOrgId = "";
let mOrganization = "";
let mUsers = "";
let mRates = "";

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

  const isDevelopment = window.location.hostname === "127.0.0.1";
   
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

        loadPage("user-management", db, 
          auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
          doc, setDoc, getDoc, getDocs, addDoc, collection, deleteDoc,
          functions, httpsCallable
        );
      }else{
        const organizations = await fetchOrganizations(db);
        showOrganizationDialog(organizations, db, async (selectedOrg) => {
          mUserOrgId = selectedOrg.id; // Set the selected organization ID
          
          // Set user's custom claim here
          const setClaims = httpsCallable(functions, 'setCustomClaims');
          await setClaims({ uid: user.uid, organizationId: mUserOrgId });

          const today = new Date();
          const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear() % 100}`;

          // New user
          const newUser = {
            name: user.displayName,
            email: user.email,
            availablePTO: 0,
            hireDate: formattedDate,
            organizationId: mUserOrgId,
            adminAccess: true
          };

          // Create a reference to the document using the userId
          const userDocRef = doc(db, `organizations/${mUserOrgId}/users/${user.uid}`);
          // Use setDoc to save the user data under the userId
          await setDoc(userDocRef, newUser);

          // update refresh token after setting user and custom claims
          updateRefreshToken(auth);
        })
      }
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
    loadUsers(db, mOrganization, getDocs, collection, query, where, mUsers, mRates);
  }

  // Load Approve Time Off screen
  if(page === "approve-time-off"){
    const response = await fetch("html/approve-time-off.html");
    const html = await response.text();
    content.innerHTML = html
    loadTimeOffUsers(db, mOrganization.id);
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

      const ratesSnapshot = await getDocs(collection(db, `organizations/${organizationId}/rates`));
      mRates = ratesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
      console.error('Error fetching organization and users:', error);
      return { organization: null, users: [] }; // Return default values on error
  }
}

async function fetchOrganizations(db) {
  const orgsSnapshot = await getDocs(collection(db, 'organizations'));
  return orgsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function showOrganizationDialog(organizations, db, onSelect) {
  const dialog = document.getElementById('organization-dialog');
  const orgList = document.getElementById('organization-list');

  if(!dialog || !orgList) return;

  orgList.innerHTML = ''; // Clear existing list

  const shadowDiv = document.getElementById("shadow");
  shadowDiv.style.display = "block";

  organizations.forEach(org => {
      const listItem = document.createElement('li');
      listItem.textContent = org.name;
      listItem.classList.add('timesheet-list-item'); // Add a class for styling
      listItem.addEventListener('click', async () => {

        shadowDiv.style.display = "none";
        dialog.style.display = 'none';
        onSelect(org); // Call the callback with the selected organization         
      });
      orgList.appendChild(listItem);
  });

  dialog.style.display = 'block'; // Show the dialog


  const orgForm = document.getElementById("org-form");
  const name = document.getElementById("org-name-field");
  const goliveDate = document.getElementById("golive-date");

  name.value = "";
  goliveDate.value = "";

  if (orgForm) {
    orgForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const newOrg = {
          name: name.value,
          goLiveDate: convertToISOString(goliveDate.value)
      };

      const orgDocRef = await addDoc(collection(db, 'organizations'), newOrg);
      const orgId = orgDocRef.id;
      newOrg.id = orgId;

      shadowDiv.style.display = "none";
      dialog.style.display = 'none';
      onSelect(newOrg)
    });
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

// This is necessary to update current user refresh token after customClaims for any user are edited for some reason
async function updateRefreshToken(auth) {
  const currentUser = auth.currentUser;
  // Refresh the token for the signed-in user
  if (currentUser) {
      try {
          await currentUser.getIdToken(true);
          // reload page to refresh data
          location.reload();
      } catch (error) {
          console.error('Error refreshing token:', error);
      }
  } else {
      console.log('No user is currently signed in.');
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
    <div id="organization-dialog-container">
      <div id="organization-dialog" style="display:none;">
        <h3>Select Your Organization</h3>
        <ul id="organization-list"></ul>
        <p>Or add a new organization</p>
        <form id="org-form">
          <div class="form-group">
              <label for="org-name-field">Organization Name</label>
              <input type="text" id="org-name-field" name="org-name-field" placeholder="Organization name" required>
          </div>
          <div class="form-group">
              <label for="golive-date">Go Live Date</label>
              <input type="date" id="golive-date" name="golive-date" required>
          </div>
          <button id="org-form-btn" type="submit">Save</button>
          <div class="update_success_box" id="update_success_box">
              <p id="message" class="message"></p>
          </div>
      </form>
      </div>
    </div>
`