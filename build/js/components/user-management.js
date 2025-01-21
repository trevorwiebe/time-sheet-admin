import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

export function loadUserManagement(db, organizationId) {
  const auth = getAuth()
  const form = document.getElementById("user-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevent the default form submission

      const name = document.getElementById("user-name").value
      const email = document.getElementById("user-email").value;
      const tempPassword = document.getElementById("temp-password").value;
      const hireDate = document.getElementById("hire-date").value;
      const adminAccess = document.getElementById("admin-access").checked;

      // Call a function to handle adding the user (you'll need to implement this)
      addNewUser(db, auth, name, email, tempPassword, hireDate, organizationId, adminAccess);
    });
  }
}

function addNewUser(
  db,
  auth, 
  name,
  email, 
  tempPassword,
  hireDate,
  organizationId,
  adminAccess
) {
  createUserWithEmailAndPassword(auth, email, tempPassword)
  .then((userCredential) => {
    // User is successfully created
    const user = userCredential.user;
    return user.uid
  })
  .then((userId) => {
    // Now we need to save the user in firestare
    const user = {
      name: name,
      email: email,
      availablePTO: 0,
      hireDate: hireDate,
      organizationId: organizationId,
      adminAccess: adminAccess
    }
    saveUserInDB(db, user, userId)
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorMessage)
  });
}

async function saveUserInDB(db, user, userId){
  const orgId = user.organizationId;
  try {
    // Create a reference to the document using the userId
    const userDocRef = doc(db, `organizations/${orgId}/users/${userId}`);
    // Use setDoc to save the user data under the userId
    await setDoc(userDocRef, user);
    console.log("User saved with Id: ", userId);
  } catch (e) {
    console.error("Error adding user: ", e);
  }
}