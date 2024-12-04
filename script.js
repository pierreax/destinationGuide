document.addEventListener('DOMContentLoaded', function() {
    console.log('Site loaded!');
    var inputs = document.querySelectorAll('input, select');
    
    // Loop through each input and select element
    inputs.forEach(function(input) {
        // Focus event: Add 'active' class to label when input/select is focused
        input.addEventListener('focus', function() {
            const label = input.previousElementSibling;
            if (label) {
                label.classList.add('active');
            }
        });

        // Blur event: Remove 'active' class from label when input/select loses focus
        input.addEventListener('blur', function() {
            const label = input.previousElementSibling;
            if (label && !input.value) {
                label.classList.remove('active');
            }
        });

        // Initial check to float label if input/select has a value
        const label = input.previousElementSibling;
        if (label && input.value) {
            label.classList.add('active');
        }
    });
});

// Global variable to store City
let city = '';

// Resize textarea to fit content
function resizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Handle form submission
document.getElementById('submitButton').addEventListener('click', async function(event) {
    event.preventDefault();
    console.log('Form submitted!');

    // Clear previous full response
    document.getElementById('fullResponse').value = '';
    document.getElementById('fullResponseForm').style.display = 'none';

    // Clear city variable and hide the SearchFlightsButton
    city = '';
    document.getElementById('searchFlightsButton').style.display = 'none';

    const loader = document.getElementById('loader');
    loader.style.display = 'block'; // Show the loader

    const submitButton = event.target;
    submitButton.disabled = true; // Disable the button

    const formData = new FormData(document.getElementById('destinationForm'));
    const preferences = {
        destination_type: formData.get('destination_type'),
        activity: formData.get('activity'),
        climate: formData.get('climate'),
        budget: formData.get('budget'),
        month: formData.get('month')
    };

    console.log('Preferences:', preferences);

    // Get the previous suggestions from sessionStorage, or initialize an empty array if none exist
    let previousSuggestions = JSON.parse(sessionStorage.getItem('previousSuggestions')) || [];
    
    // Create the requestBody object correctly
    const requestBody = {
        preferences: preferences,
        previousSuggestions: previousSuggestions
    };

    console.log('Request Body:', requestBody);

    try {
        const response = await fetch('/suggest-destination', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        loader.style.display = 'none'; // Hide the loader

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponseText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split the buffer by double newline to get complete SSE events
            let parts = buffer.split('\n\n');
            buffer = parts.pop(); // Save the last incomplete part

            for (let part of parts) {
                if (part.trim() === '') continue;

                const lines = part.split('\n');
                let event = null;
                let data = null;

                for (let line of lines) {
                    if (line.startsWith('event: ')) {
                        event = line.replace('event: ', '').trim();
                    } else if (line.startsWith('data: ')) {
                        data = JSON.parse(line.replace('data: ', '').trim());
                    }
                }

                if (event === 'full_response' && data.full_response) {
                    const fullResponseTextarea = document.getElementById('fullResponse');
                    fullResponseText += data.full_response;
                    fullResponseTextarea.value = fullResponseText; // Overwrite to prevent duplication
                    document.getElementById('fullResponseForm').style.display = 'block'; // Show the full response form
                    resizeTextarea(fullResponseTextarea); // Resize the textarea to fit content
                }

                if (event === 'end') {
                    // Connection has ended
                    console.log('Streaming completed.');
                    loader.style.display = 'none'; // Hide the loader
                    submitButton.disabled = false; // Enable the button

                    // After streaming is complete, extract City
                    city = fullResponseText.split(',')[0].trim();
                    console.log('Extracted City:', city);

                    // Add the current city to the previous suggestions list
                    if (city) {
                        previousSuggestions.push(city);  // Add the extracted city
                    }

                    // Save the updated suggestions back to sessionStorage
                    sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

                    // Show the searchFlightsButton
                    document.getElementById('searchFlightsButton').style.display = 'block';

                    // Change button text after displaying first suggestion
                    console.log('Changing the text in Submitbutton');
                    submitButton.innerText = 'Suggest Something Else';
                }

                if (event === 'error' && data.error) {
                    console.error('Error from backend:', data.error);
                    alert('Error fetching suggestions: ' + data.error);
                    loader.style.display = 'none'; // Hide the loader
                    submitButton.disabled = false; // Enable the button
                    submitButton.innerText = 'Get Suggestion'; // Revert button text
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching suggestions. Please try again later.');
        loader.style.display = 'none'; // Hide the loader
        submitButton.disabled = false; // Enable the button
        submitButton.innerText = 'Get Suggestion'; // Revert button text
    }
});

// This event listener ensures the "Search Flights" button only opens a new tab with the URL.
document.getElementById('searchFlightsButton').addEventListener('click', function() {
    if (city) {
        console.log('Opening a new tab with ', city);
        window.open(`https://www.robotize.no/flights?city=${encodeURIComponent(city)}`, '_blank');
    }
});
