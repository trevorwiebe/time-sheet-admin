
export function loadUserManagement(
  db, 
  auth, createUserWithEmailAndPassword,
  organizationId, usersList,
  doc, setDoc,
  functions, httpsCallable,
  updateUserCallback
) {
  const form = document.getElementById("user-form");
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users) {
    userList.innerHTML = ''; // Clear existing list
    users.forEach(user => {
        const listItem = createUserListItem(user)
        userList.appendChild(listItem);
    });
  }

  renderUserList(usersList)

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
        functions, httpsCallable, updateUserCallback
      );
    });
  }

  const editUserDialog = document.getElementById("edit_user_box");
  const userListItems = document.querySelectorAll('.user-list-item');

  window.addEventListener("click", (event) => {
    // Check if the click was outside the dialog
    if (editUserDialog && !editUserDialog.contains(event.target) && !Array.from(userListItems).includes(event.target)) {
      editUserDialog.style.display = "none"; // Close the dialog
    }
  });

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
  httpsCallable,
  updateUserCallback
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
      updateUserCallback(newUser)

      const userList = document.getElementById("user-list");
      const listItem = createUserListItem(newUser)
      userList.appendChild(listItem);
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

function createUserListItem(user) {
  const listItem = document.createElement('li');
  listItem.textContent = `${user.name} \n\n(${user.email})`; // Customize the display text
  listItem.classList.add('user-list-item'); // Add a class for styling

  // Add a click event listener
  listItem.addEventListener('click', () => {
      // Handle the click event (e.g., show user details or edit user)
      const editUserDialog = document.getElementById("edit_user_box");
      editUserDialog.style.display = "block";
  });

  return listItem;
}