import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js"

document.addEventListener("DOMContentLoaded", () => {

    const auth = getAuth();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/auth.user
            const uid = user.uid;
            onSignInSuccess(auth)
        } else {
            // User is signed out
            showSignInScreen(auth)
            console.log("user is signed out")
        }
    });

});

function showSignInScreen(auth) {

    // Hide header and footer
    const header = document.getElementById("main_header");
    header.style.display = "none"

    const footer = document.getElementById("main_footer")
    footer.style.display = "none"

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
            console.log(user)
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

const signInHTML = `
    <div id="signin-container">
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
        </p>
    </div>
`