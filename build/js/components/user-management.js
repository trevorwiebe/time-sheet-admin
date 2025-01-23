
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

  const editUserDialog = document.getElementById("edit_user_box");
  const userListItems = document.querySelectorAll('.user-list-item');

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
  createUserWithEmailAndPassword(auth, email, tempPassword)
    .then((userCredential) => {
      const user = userCredential.user;
      // Set custom claims
      const setClaims = httpsCallable(functions, 'setCustomClaims');
      return setClaims({ uid: user.uid, organizationId: organizationId });
    })
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
    .then((newUser) => {
      updateUserCallback(newUser);

      updateUserAndRefreshToken(auth);
      const userList = document.getElementById("user-list");
      const listItem = createUserListItem(newUser, db, doc, setDoc, httpsCallable, functions, deleteDoc);
      userList.appendChild(listItem);
      document.getElementById("empty_user_list").style.display = "none";
    })
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

function createUserListItem(user, db, doc, setDoc, httpsCallable, functions, deleteDoc) {
  const listItem = document.createElement('li');
  listItem.textContent = `${user.name} \n\n(${user.email})`; // Customize the display text
  listItem.classList.add('user-list-item'); // Add a class for styling

  // Add a click event listener
  listItem.addEventListener('click', () => {
    // Handle the click event (e.g., show user details or edit user)
    const editUserDialog = document.getElementById("edit_user_box");
    editUserDialog.style.display = "block";

    const name = document.getElementById("edit-user-name");
    const email = document.getElementById("edit-user-email");
    const hireDate = document.getElementById("edit-hire-date");
    const adminAccess = document.getElementById("edit-admin-access");
    const updateBtn = document.getElementById("edit-user-form-btn");
    const deleteUserBtn = document.getElementById("delete-user-btn");

    name.value = user.name;
    email.value = user.email;
    hireDate.value = user.hireDate;
    adminAccess.checked = user.adminAccess;

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

      // Update user in Firebase Auth
      const userRef = doc(db, `organizations/${user.organizationId}/users/${user.id}`);
      await setDoc(userRef, newUser);

      updateUserInAuth(newUser.id, email.value, name.value, httpsCallable, functions);
    })

    deleteUserBtn.addEventListener('click', async(e) => {
      e.preventDefault();
      const uid = user.id;
      const orgId = user.organizationId;
      deleteUser(uid, orgId, db, doc, httpsCallable, functions, deleteDoc);
      // location.reload();
    })

  });

  return listItem;
}

async function updateUserAndRefreshToken(auth) {
  const currentUser = auth.currentUser;

  // Refresh the token for the signed-in user
  if (currentUser) {
      try {
          const idTokenResult = await currentUser.getIdToken(true);
          console.log('Token refreshed:', idTokenResult);
          // Now you can access the updated claims
      } catch (error) {
          console.error('Error refreshing token:', error);
      }
  } else {
      console.log('No user is currently signed in.');
  }
}

async function updateUserInAuth(uid, email, displayName, httpsCallable, functions) {
  const updateUserFunction = httpsCallable(functions, 'updateUser');
  try {
      const result = await updateUserFunction({ uid, email, displayName });
      console.log(result.data.message);
      location.reload()
  } catch (error) {
      console.error('Error updating user:', error);
  }
}


async function deleteUser(uid, organizationId, db, doc, httpsCallable, functions, deleteDoc) {

  try{
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    await deleteUserFunction({uid});
    // Create a reference to the document using the userId
    const userDocRef = doc(db, `organizations/${organizationId}/users/${uid}`);
    // Use deleteDoc to remove the user document
    await deleteDoc(userDocRef);

    location.reload();
  } catch{
    console.log("an error occurred deleting user");
  } 
}