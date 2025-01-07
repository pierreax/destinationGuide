document.addEventListener('DOMContentLoaded', () => {
    console.log('Site loaded');

    // Cache frequently accessed DOM elements
    const form = document.getElementById('destinationForm');
    const submitButton = document.getElementById('submitButton');
    const searchFlightsButton = document.getElementById('searchFlightsButton');
    const loader = document.getElementById('loader');
    const fullResponseForm = document.getElementById('fullResponseForm');
    const fullResponseTextarea = document.getElementById('fullResponse');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const resultsContainer = document.querySelector('.results-box'); // Assuming this is the container
    const submitText = document.getElementById('submitText');

    let city = '';

    /**
     * Resize textarea to fit content
     * @param {HTMLElement} textarea 
     */
    const resizeTextarea = (textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    /**
     * Handle label animations using event delegation
     */
    const handleLabelAnimations = (event) => {
        const { target } = event;
        if (target.matches('input, select, textarea')) {
            const label = target.previousElementSibling;
            if (!label) return;

            if (event.type === 'focus') {
                label.classList.add('active');
            } else if (event.type === 'blur') {
                if (!target.value.trim()) {
                    label.classList.remove('active');
                }
            }
        }
    };

    // Attach event listeners for focus and blur using event delegation
    form.addEventListener('focus', handleLabelAnimations, true);
    form.addEventListener('blur', handleLabelAnimations, true);

    // Initial check to float labels if inputs have values
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const label = input.previousElementSibling;
        if (label && input.value.trim()) {
            label.classList.add('active');
        }
    });

    /**
     * Handle form submission
     */
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        console.log('Form submitted!');

        // Hide previous responses and reset UI
        fullResponseTextarea.value = '';
        fullResponseForm.style.display = 'none';
        searchFlightsButton.style.display = 'none';
        noResultsMessage.style.display = 'none';

        city = '';
        loader.style.display = 'block'; // Show the loader
        submitButton.disabled = true; // Disable the button

        const formData = new FormData(form);
        const preferences = {
            destination_type: formData.get('destination_type'),
            activity: formData.get('activity'),
            climate: formData.get('climate'),
            budget: formData.get('budget'),
            month: formData.get('month')
        };

        console.log('Preferences:', preferences);

        // Retrieve previous suggestions from sessionStorage
        const previousSuggestions = JSON.parse(sessionStorage.getItem('previousSuggestions')) || [];

        const requestBody = {
            preferences,
            previousSuggestions
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
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }

            // Use EventSource for SSE if possible
            if (typeof EventSource !== 'undefined') {
                handleSSE(response);
            } else {
                // Fallback if EventSource is not supported
                await handleSSEFallback(response);
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error fetching suggestions. Please try again later.');
            loader.style.display = 'none'; // Hide the loader
            submitButton.disabled = false; // Enable the button
            submitButton.innerText = 'Get Suggestion'; // Revert button text
        }
    };

    /**
     * Handle Server-Sent Events using EventSource
     * @param {Response} response 
     */
    const handleSSE = (response) => {
        const eventSource = new EventSourcePolyfill('/suggest-destination', {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                preferences: {
                    destination_type: form.querySelector('[name="destination_type"]').value,
                    activity: form.querySelector('[name="activity"]').value,
                    climate: form.querySelector('[name="climate"]').value,
                    budget: form.querySelector('[name="budget"]').value,
                    month: form.querySelector('[name="month"]').value
                },
                previousSuggestions: JSON.parse(sessionStorage.getItem('previousSuggestions')) || []
            })
        });

        let fullResponseText = '';

        eventSource.addEventListener('full_response', (e) => {
            const data = JSON.parse(e.data);
            if (data.full_response) {
                fullResponseText += data.full_response;
                fullResponseTextarea.value = fullResponseText;
                resizeTextarea(fullResponseTextarea);
                fullResponseForm.style.display = 'block';
            }
        });

        eventSource.addEventListener('end', () => {
            console.log('Streaming completed!');
            loader.style.display = 'none'; // Hide the loader
            submitButton.disabled = false; // Enable the button
            submitButton.innerText = 'Suggest Something Else';

            // Extract City from the full response
            city = fullResponseText.split(',')[0].trim();
            console.log('Extracted City:', city);

            if (city) {
                previousSuggestions.push(city);
                sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));
                searchFlightsButton.style.display = 'block';
            }

            eventSource.close();
        });

        eventSource.addEventListener('error', (e) => {
            console.error('SSE Error:', e);
            alert('Error fetching suggestions.');
            loader.style.display = 'none';
            submitButton.disabled = false;
            submitButton.innerText = 'Get Suggestion';
            eventSource.close();
        });
    };

    /**
     * Fallback for SSE using fetch and manual parsing
     * @param {Response} response 
     */
    const handleSSEFallback = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponseText = '';

        try {
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
                        city = fullResponseText.split(',')[0].trim();
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
            console.error('SSE Fallback Error:', error);
            alert('Error fetching suggestions.');
            loader.style.display = 'none';
            submitButton.disabled = false;
            submitButton.innerText = 'Get Suggestion';
        }
    };

    /**
     * Handle "Search Flights" button click
     */
    const handleSearchFlights = () => {
        if (city) {
            console.log('Opening a new tab with', city);
            window.open(`https://www.robotize.no/flights?city=${encodeURIComponent(city)}`, '_blank');
        }
    };

    // Attach event listeners
    submitButton.addEventListener('click', handleFormSubmit);
    searchFlightsButton.addEventListener('click', handleSearchFlights);
});
