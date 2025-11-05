document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // **IMPORTANT:  This is client-side validation only!  NEVER rely on client-side validation for security!**
        // **In a real application, you MUST validate the username and password on the server.**

        if (username === 'test' && password === 'password') { //Replace 'test' and 'password' with secure credentials.
            // Simulate successful login
            errorMessage.textContent = ''; // Clear any previous error messages
            alert('Login successful!'); //Replace with redirect or other actions
            //window.location.href = "dashboard.html"; // Example: Redirect to a dashboard page
        } else {
            errorMessage.textContent = 'Invalid username or password.';
        }
    });
});
