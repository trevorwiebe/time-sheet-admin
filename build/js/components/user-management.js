
export function loadUserManagement(
  db, 
  auth, createUserWithEmailAndPassword, updateProfile, updateEmail, sendEmailVerification, updatePassword, sendPasswordResetEmail, deleteUser,
  organizationId, usersList,
  doc, setDoc,
  functions, httpsCallable,
  updateUserCallback, updateUser
) {
  const form = document.getElementById("user-form");
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users) {
    const emptyListNote = document.getElementById("empty_user_list");
    userList.innerHTML = ''; // Clear existing list
    if(users.length !== 0){
      users.forEach(user => {
          const listItem = createUserListItem(user, db, doc, setDoc, auth, updateEmail)
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
        doc, setDoc, createUserWithEmailAndPassword,
        functions, httpsCallable, updateUserCallback, updateUser
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
  createUserWithEmailAndPassword,
  functions,
  httpsCallable,
  updateUserCallback,
  updateEmail
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
      const listItem = createUserListItem(newUser, db, doc, setDoc, auth, updateEmail);
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

function createUserListItem(user, db, doc, setDoc, auth, updateEmail) {
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

      // Update user in Firebase Auth
      const authUserRef = auth.currentUser;
      if (authUserRef) {
          // Update the user's email
          const userCredential = await updateEmail(authUserRef, email.value);
          
          // Optionally, you can handle the response or errors here
          console.log('User updated successfully:', userCredential);
          // location.reload();
      } else {
          throw new Error('No user is currently signed in.');
      }

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