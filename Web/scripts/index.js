document.addEventListener("DOMContentLoaded", function() { // Ensure DOM is fully loaded

    const mainContainer = document.getElementById("collapsible-container");

    // Function to create a single collapsible element
    function createCollapsible(functionNumber) {
        // Create the collapsible button
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("collapsible");
        button.textContent = `Function ${functionNumber}`;

        // Create the content div
        const content = document.createElement("div");
        content.classList.add("content");

        // Create the "Hello World" paragraph
        const paragraph = document.createElement("p");
        paragraph.textContent = "Hello World";

        // Create the Cancel button
        const cancelButton = document.createElement("button");
        cancelButton.classList.add("cancel-btn");
        cancelButton.textContent = "Cancel";

        // Create the Save button
        const saveButton = document.createElement("button");
        saveButton.classList.add("save-btn");
        saveButton.textContent = "Save";

        // Append elements to the content div
        content.appendChild(paragraph);
        content.appendChild(cancelButton);
        content.appendChild(saveButton);

        // Append button and content to the main container
        const containerDiv = document.createElement("div");
        containerDiv.classList.add("collapsible-container"); // Add a container div for spacing
        containerDiv.appendChild(button);
        containerDiv.appendChild(content);

        mainContainer.appendChild(containerDiv);

        // Add event listener to the button to toggle content visibility
        button.addEventListener("click", function() {
            this.classList.toggle("active");
            content.style.display = content.style.display === "block" ? "none" : "block";
        });
    }

    // Create three collapsible elements
    for (let i = 1; i <= 3; i++) {
        createCollapsible(i);
    }
});
