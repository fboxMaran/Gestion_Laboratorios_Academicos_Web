document.addEventListener("DOMContentLoaded", function() { // Ensure DOM is fully loaded

    const profileContent = document.getElementById("profile-content");

    // Sample user data (replace with your actual data)
    const userData = {
        profilePic: "https://via.placeholder.com/100", // Placeholder image
        name: "John Doe",
        role: "Administrator",
        email: "john.doe@example.com",
        location: "New York"
    };

    // Create the user profile section
    const userProfileDiv = document.createElement("div");
    userProfileDiv.id = "user-profile";

    // Create profile picture element
    const profilePic = document.createElement("img");
    profilePic.src = userData.profilePic;
    profilePic.alt = "Profile Picture";

    // Create name element
    const nameHeading = document.createElement("h2");
    nameHeading.textContent = userData.name;

    // Create role element
    const roleParagraph = document.createElement("p");
    roleParagraph.textContent = `Role: ${userData.role}`;

     // Create email element
    const emailParagraph = document.createElement("p");
    emailParagraph.textContent = `Email: ${userData.email}`;

    // Create location element
    const locationParagraph = document.createElement("p");
    locationParagraph.textContent = `Location: ${userData.location}`;

    // Append elements to the user profile div
    userProfileDiv.appendChild(profilePic);
    userProfileDiv.appendChild(nameHeading);
    userProfileDiv.appendChild(roleParagraph);
    userProfileDiv.appendChild(emailParagraph);
    userProfileDiv.appendChild(locationParagraph);

    // Append the user profile section to the main content area
    profileContent.appendChild(userProfileDiv);
});
