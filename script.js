document.addEventListener('DOMContentLoaded', () => {
    console.log('Site loaded');

    // Cache the form and its elements
    const destinationForm = document.getElementById('destinationForm');
    const submitButton = document.getElementById('submitButton');
    const loader = document.getElementById('loader');
    const fullResponseTextarea = document.getElementById('fullResponse');
    const fullResponseForm = document.getElementById('fullResponseForm');
    const searchFlightsButton = document.getElementById('searchFlightsButton');

    // Event Delegation for focus and blur on input and select elements
    destinationForm.addEventListener('focusin', (event) => {
        const target = event.target;
        if (target.matches('input, select')) {
            const label = target.previousElementSibling;
            if (label) {
                label.classList.add('active');
            }
        }
    });

    destinationForm.addEventListener('focusout', (event) => {
        const target = event.target;
        if (target.matches('input, select')) {
            const label = target.previousElementSibling;
            if (label && !target.value) {
                label.classList.remove('active');
            }
        }
    });

    // Initial check to float labels if input/select has a value
    const inputs = destinationForm.querySelectorAll('input, select');
    inputs.forEach((input) => {
        const label = input.previousElementSibling;
        if (label && input.value) {
            label.classList.add('active');
        }
    });

    // Global variable to store City
    let city = '';

    // Resize textarea to fit content
    const resizeTextarea = (textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // Handle form submission
    submitButton.addEventListener('click', async (event) => {
        event.preventDefault();
        console.log('Form submitted!');

        // Clear previous full response
        fullResponseTextarea.value = '';
        fullResponseForm.style.display = 'none';

        // Clear city variable and hide the SearchFlightsButton
        city = '';
        searchFlightsButton.style.display = 'none';

        loader.style.display = 'block'; // Show the loader
        submitButton.disabled = true; // Disable the button

        const formData = new FormData(destinationForm);
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
                            try {
                                data = JSON.parse(line.replace('data: ', '').trim());
                            } catch (e) {
                                console.error('Failed to parse JSON:', e);
                                continue;
                            }
                        }
                    }

                    if (event === 'full_response' && data?.full_response) {
                        fullResponseText += data.full_response;
                        fullResponseTextarea.value = fullResponseText; // Overwrite to prevent duplication
                        fullResponseForm.style.display = 'block'; // Show the full response form
                        resizeTextarea(fullResponseTextarea); // Resize the textarea to fit content
                    }

                    if (event === 'end') {
                        // Connection has ended
                        console.log('Streaming completed!');
                        loader.style.display = 'none'; // Hide the loader
                        submitButton.disabled = false; // Enable the button

                        // After streaming is complete, extract City
                        city = fullResponseText.split(',')[0]?.trim() || '';
                        console.log('Extracted City:', city);

                        // Add the current city to the previous suggestions list
                        if (city) {
                            previousSuggestions.push(city);  // Add the extracted city
                        }

                        // Save the updated suggestions back to sessionStorage
                        sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

                        // Show the searchFlightsButton
                        searchFlightsButton.style.display = 'block';

                        // Change button text after displaying first suggestion
                        submitButton.innerText = 'Suggest Something Else';
                    }

                    if (event === 'error' && data?.error) {
                        console.error('Error from backend:', data.error);
                        alert('Error fetching suggestions: ' + data.error);
                        loader.style.display = 'none'; // Hide the loader
                        submitButton.disabled = false; // Enable the button
                        submitButton.innerText = 'Get Suggestion'; // Revert button text
                    }
                }
            }

            // In case the stream ends without an 'end' event
            if (fullResponseText && !city) {
                city = fullResponseText.split(',')[0]?.trim() || '';
                console.log('Extracted City:', city);
                if (city) {
                    previousSuggestions.push(city);
                    sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));
                    searchFlightsButton.style.display = 'block';
                    submitButton.innerText = 'Suggest Something Else';
                }
            }

            loader.style.display = 'none'; // Ensure loader is hidden
            submitButton.disabled = false; // Ensure button is enabled

        } catch (error) {
            console.error('Error:', error);
            alert('Error fetching suggestions. Please try again later.');
            loader.style.display = 'none'; // Hide the loader
            submitButton.disabled = false; // Enable the button
            submitButton.innerText = 'Get Suggestion'; // Revert button text
        }
    });

    // This event listener ensures the "Search Flights" button only opens a new tab with the URL.
    searchFlightsButton.addEventListener('click', () => {
        if (city) {
            console.log('Opening a new tab with ', city);
            window.open(`https://www.robotize.no/flights?city=${encodeURIComponent(city)}`, '_blank');
        }
    });
});
