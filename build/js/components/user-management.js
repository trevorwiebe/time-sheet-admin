import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

export function loadUserManagement() {
  const auth = getAuth()
  const form = document.getElementById("user-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevent the default form submission

      const name = document.getElementById("user-name").value
      const email = document.getElementById("user-email").value;
      const tempPassword = document.getElementById("temp-password").value;
      const hireDate = document.getElementById("hire-date").value;

      // Call a function to handle adding the user (you'll need to implement this)
      addUser(auth, email, tempPassword);
    });
  }
}

function addUser(
  auth, 
  name,
  email, 
  tempPassword,
  hireDate
) {
  createUserWithEmailAndPassword(auth, email, tempPassword)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    user.uid
  })
  .then((userId) => {
    const user = {
      name: name,
      email: email,
      availablePTO: 0,
      hireDate: hireDate,
      adminAccess: false
    }
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorMessage)
  });
}