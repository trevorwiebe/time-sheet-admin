
export function loadUserManagement(
  db, 
  auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
  organizationId, usersList,
  doc, setDoc, deleteDoc,
  functions, httpsCallable,
  updateUserCallback
) {
  const form = document.getElementById("user-form");
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users) {
    const emptyListNote = document.getElementById("empty_user_list");
    userList.innerHTML = ''; // Clear existing list
    if(users.length !== 0){
      users.forEach(user => {
          const listItem = createUserListItem(user, db, doc, setDoc, httpsCallable, functions, deleteDoc);
          userList.appendChild(listItem);
      });
      emptyListNote.style.display = "none";
    }else{
      emptyListNote.style.display = "block";
    }
  }

  renderUserList(usersList)

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent the default form submission

      const name = document.getElementById("user-name").value
      const email = document.getElementById("user-email").value;
      const tempPassword = document.getElementById("temp-password").value;
      const hireDate = document.getElementById("hire-date").value;
      const adminAccess = document.getElementById("admin-access").checked;

      // Call a function to handle adding the user (you'll need to implement this)
      await addNewUser(
        db, auth, 
        name, email, tempPassword, hireDate, organizationId, adminAccess,
        doc, setDoc, deleteDoc, createUserWithEmailAndPassword,
        functions, httpsCallable, updateUserCallback
      );
    });
  }


  // Check if user clicks on anything that should close the edit_user-box dialog
  const editUserDialog = document.getElementById("edit_user_box");
  const userListItems = document.querySelectorAll('.timesheet-list-item');
  window.addEventListener("click", (event) => {
    // Check if the click was outside the dialog
    if (
      editUserDialog && 
      !editUserDialog.contains(event.target) && 
      !Array.from(userListItems).includes(event.target) &&
      event.target.id != "edit-user-form-btn"
    ) {
      editUserDialog.style.display = "none"; // Close the dialog
    }
  });

}

async function addNewUser(
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
  deleteDoc,
  createUserWithEmailAndPassword,
  functions,
  httpsCallable,
  updateUserCallback,
) {
  // First create auth user
  createUserWithEmailAndPassword(auth, email, tempPassword)

    // Then set the organizationId as a custom claim
    .then((userCredential) => {
      const user = userCredential.user;
      // Set custom claims
      const setClaims = httpsCallable(functions, 'setCustomClaims');
      return setClaims({ uid: user.uid, organizationId: organizationId });
    })

    // Then save the user in firestore database
    .then((successData) => {
      // Now we need to save the user in Firestore
      const userId = successData.data.uid;
      const user = {
          name: name,
          email: email,
          availablePTO: 0,
          hireDate: hireDate,
          organizationId: organizationId,
          adminAccess: adminAccess
      };
      return saveUserInDB(db, user, userId, organizationId, doc, setDoc);
    })

    // Then send the user back in the updateUserCallback to update the user list in main.js and refresh user tokens
    .then((newUser) => {

      // Send user back to main.js
      updateUserCallback(newUser);
      return {email: newUser.email, password: tempPassword}
    })

    .then((credentials) => {
      const email = credentials.email;
      const password = credentials.password;
      // Send new user welcome email
      return sendWelcomeEmail(email, password, httpsCallable, functions);
    })

    .then(() => {
      // Refresh the user tokens
      updateRefreshToken(auth);
    })

    // Show errors, if any
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorMessage)
    });
}

async function saveUserInDB(db, user, userId, organizationId, doc, setDoc){
  try {
    // Create a reference to the document using the userId
    const userDocRef = doc(db, `organizations/${organizationId}/users/${userId}`);
    // Use setDoc to save the user data under the userId
    await setDoc(userDocRef, user);
    return user
  } catch (e) {
    console.error("Error adding user: ", e);
  }
}

// Send welcome email with firebase function
async function sendWelcomeEmail(userEmail, userPassword, httpsCallable, functions){
  const sendWelcomeEmail = httpsCallable(functions, 'sendWelcomeEmail');
  sendWelcomeEmail({ email: userEmail, password: userPassword })
    .then((result) => {
        console.log(result.data.message);
    })
    .catch((error) => {
        console.error('Error sending welcome email:', error);
    });
}

function createUserListItem(user, db, doc, setDoc, httpsCallable, functions, deleteDoc) {
  const listItem = document.createElement('li');
  listItem.textContent = `${user.name} \n\n(${user.email})`; // Customize the display text
  listItem.classList.add('timesheet-list-item'); // Add a class for styling

  listItem.addEventListener('click', () => {
    // Show edit user dialog box
    const editUserDialog = document.getElementById("edit_user_box");
    editUserDialog.style.display = "block";

    const name = document.getElementById("edit-user-name");
    const email = document.getElementById("edit-user-email");
    const hireDate = document.getElementById("edit-hire-date");
    const adminAccess = document.getElementById("edit-admin-access");

    // Fill fields with current user details
    name.value = user.name;
    email.value = user.email;
    hireDate.value = user.hireDate;
    adminAccess.checked = user.adminAccess;

    // Update user button
    const updateBtn = document.getElementById("edit-user-form-btn");
    updateBtn.addEventListener('click', async (e) => {

      e.preventDefault();

      const newUser = {
        id: user.id,
        name: name.value,
        email: email.value,
        hireDate: hireDate.value,
        adminAccess: adminAccess.checked,
        organizationId: user.organizationId
      }

      updateUser(newUser, db, setDoc, doc, httpsCallable, functions);
    })

    // Delete user button
    const deleteUserBtn = document.getElementById("delete-user-btn");
    deleteUserBtn.addEventListener('click', async(e) => {
      e.preventDefault();
      const uid = user.id;
      const orgId = user.organizationId;
      deleteUser(uid, orgId, db, doc, httpsCallable, functions, deleteDoc);
    })

  });

  return listItem;
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

// Update user in auth and in firestore
async function updateUser(newUser, db, setDoc, doc, httpsCallable, functions) {
  const uid = newUser.id;
  const email = newUser.email;
  const displayName = newUser.name;
  const organizationId = newUser.organizationId;
  try {
    // Use updateUser function, because this is admin.auth() functionality
    const updateUserFunction = httpsCallable(functions, 'updateUser');
    await updateUserFunction({ uid, email, displayName });
    // Update user in Firebase Auth
    const userRef = doc(db, `organizations/${organizationId}/users/${uid}`);
    await setDoc(userRef, newUser);
    // Reload page when finished updating user
    location.reload()
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

// Delete user in auth and in firestore
async function deleteUser(uid, organizationId, db, doc, httpsCallable, functions, deleteDoc) {
  try{
    // Need to use a function to delete user, because this is admin.auth() functionality
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    await deleteUserFunction({uid});
    // Create a reference to the document using the userId
    const userDocRef = doc(db, `organizations/${organizationId}/users/${uid}`);
    // Use deleteDoc to remove the user document
    await deleteDoc(userDocRef);
    // Reload page when finished deleting user
    location.reload();
  } catch{
    console.log("an error occurred deleting user");
  } 
}