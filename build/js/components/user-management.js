
export function loadUserManagement(
  db, 
  auth, createUserWithEmailAndPassword,
  organizationId, 
  doc, setDoc,
  functions, httpsCallable
) {
  
  console.log("userManagement")
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
      addNewUser(
        db, auth, 
        name, email, tempPassword, hireDate, organizationId, adminAccess,
        doc, setDoc, createUserWithEmailAndPassword,
        functions, httpsCallable
      );
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
  adminAccess,
  doc,
  setDoc,
  createUserWithEmailAndPassword,
  functions,
  httpsCallable
) {
  createUserWithEmailAndPassword(auth, email, tempPassword)
    .then((userCredential) => {
      const user = userCredential.user;
      // Set custom claims
      const setClaims = httpsCallable(functions, 'setCustomClaims');
      console.log(user.uid)
      console.log(organizationId)
      return setClaims({ uid: user.uid, organizationId: organizationId });
    })
    .then((successData) => {
      // Now we need to save the user in Firestore
      const userId = successData.data.uid;
      const organizationId = successData.data.organizationId
      const user = {
          name: name,
          email: email,
          availablePTO: 0,
          hireDate: hireDate,
          organizationId: organizationId,
          adminAccess: adminAccess
      };
      return saveUserInDB(db, user, userId, doc, setDoc);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorMessage)
    });
}

async function saveUserInDB(db, user, userId, doc, setDoc){
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