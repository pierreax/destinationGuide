// script.js

document.addEventListener('DOMContentLoaded', function() {
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

// Load airport data from 'airports.txt'
async function loadAirportsData() {
    const response = await fetch('airports.txt');
    const text = await response.text();
    const airportLines = text.split('\n');
    const airportData = [];

    // Process each line of the airports data
    airportLines.forEach(line => {
        const [iata, city] = line.split(' - ');
        if (iata && city) {
            // Normalize the city name to remove accents
            const normalizedCity = city.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            airportData.push({ iata: iata.trim(), city: normalizedCity });
        }
    });

    return airportData;
}

// Resize textarea to fit content
function resizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Variable to store the current IATA code for flights
let currentIataCodeTo = '';

// Handle form submission
document.getElementById('submitButton').addEventListener('click', async function(event) {
    event.preventDefault();
    console.log('Form submitted!');

    // Clear previous suggestions and full response
    document.getElementById('suggestion').innerText = '';
    document.getElementById('fullResponse').innerText = '';
    document.getElementById('fullResponseForm').style.display = 'none';
    document.getElementById('additionalInfoHeader').style.display = 'none';
    document.getElementById('generateInfoHeader').style.display = 'none';
    document.getElementById('suggestion-container').style.display = 'none'; 

    // Clear iataCodeTo variable and hide the SearchFlightsButton
    currentIataCodeTo = '';
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

    let previousSuggestions = JSON.parse(sessionStorage.getItem('previousSuggestions')) || [];
    
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
        let isSuggestionReceived = false; // Flag to track if suggestion is received

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split the buffer by newline to process complete chunks
            let parts = buffer.split('\n');
            buffer = parts.pop(); // Save the last incomplete part

            for (let part of parts) {
                if (part.trim() === '') continue;
                try {
                    const data = JSON.parse(part);
                    console.log('Received chunk:', data);

                    if (data.suggestion) {
                        if (!previousSuggestions.includes(data.suggestion)) {
                            previousSuggestions.push(data.suggestion);
                            sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

                            document.getElementById('suggestion').innerText = data.suggestion;
                            document.getElementById('suggestion-container').style.display = 'block'; // Show suggestion field
                            
                            // Hide the loader after receiving the first chunk (suggestion)
                            loader.style.display = 'none';

                            // Change button text after displaying city and country
                            submitButton.innerText = 'Suggest Something Else';

                            // Show the additional information headers
                            document.getElementById('additionalInfoHeader').style.display = 'block';
                            document.getElementById('generateInfoHeader').style.display = 'block';

                            // Load the airport data to create the link dynamically
                            loadAirportsData().then(airports => {
                                const suggestionCity = data.suggestion.split(",")[0].trim(); // Extract the city from the suggestion
                                const normalizedSuggestionCity = suggestionCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const matchedAirport = airports.find(airport => airport.city.includes(normalizedSuggestionCity));
                                if (matchedAirport) {
                                    currentIataCodeTo = matchedAirport.iata;
                                    console.log('Creating link with ', currentIataCodeTo)
                                    const searchFlightsButton = document.getElementById('searchFlightsButton');
                                    searchFlightsButton.onclick = function() {
                                        window.open(`https://www.robotize.no/flights?iataCodeTo=${currentIataCodeTo}`, '_blank'); // Open in new tab
                                    };
                                    searchFlightsButton.style.display = 'block'; // Show the button
                                }
                            });

                            isSuggestionReceived = true; // Mark that suggestion has been received
                        }
                    }

                    if (data.full_response) {
                        const fullResponseTextarea = document.getElementById('fullResponse');
                        fullResponseTextarea.value += data.full_response + '\n'; // Append to existing content
                        document.getElementById('fullResponseForm').style.display = 'block'; // Show the full response form
                        resizeTextarea(fullResponseTextarea); // Resize the textarea to fit content
                    }

                } catch (err) {
                    console.error('Error parsing chunk:', err);
                }
            }
        }

        // Handle any remaining buffer
        if (buffer.trim() !== '') {
            try {
                const data = JSON.parse(buffer);
                console.log('Received final chunk:', data);

                if (data.suggestion) {
                    if (!previousSuggestions.includes(data.suggestion)) {
                        previousSuggestions.push(data.suggestion);
                        sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

                        document.getElementById('suggestion').innerText = data.suggestion;
                        document.getElementById('suggestion-container').style.display = 'block'; // Show suggestion field
                        
                        // Hide the loader after receiving the suggestion
                        loader.style.display = 'none';

                        // Change button text after displaying city and country
                        submitButton.innerText = 'Suggest Something Else';

                        // Show the additional information headers
                        document.getElementById('additionalInfoHeader').style.display = 'block';
                        document.getElementById('generateInfoHeader').style.display = 'block';

                        // Load the airport data to create the link dynamically
                        loadAirportsData().then(airports => {
                            const suggestionCity = data.suggestion.split(",")[0].trim(); // Extract the city from the suggestion
                            const normalizedSuggestionCity = suggestionCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const matchedAirport = airports.find(airport => airport.city.includes(normalizedSuggestionCity));
                            if (matchedAirport) {
                                currentIataCodeTo = matchedAirport.iata;
                                console.log('Creating link with ', currentIataCodeTo)
                                const searchFlightsButton = document.getElementById('searchFlightsButton');
                                searchFlightsButton.onclick = function() {
                                    window.open(`https://www.robotize.no/flights?iataCodeTo=${currentIataCodeTo}`, '_blank'); // Open in new tab
                                };
                                searchFlightsButton.style.display = 'block'; // Show the button
                            }
                        });

                        isSuggestionReceived = true; // Mark that suggestion has been received
                    }
                }

                if (data.full_response) {
                    const fullResponseTextarea = document.getElementById('fullResponse');
                    fullResponseTextarea.value += data.full_response + '\n'; // Append to existing content
                    document.getElementById('fullResponseForm').style.display = 'block'; // Show the full response form
                    resizeTextarea(fullResponseTextarea); // Resize the textarea to fit content
                }

            } catch (err) {
                console.error('Error parsing final chunk:', err);
            }
        }

        loader.style.display = 'none'; // Hide loader
        submitButton.disabled = false; // Enable the button

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
    if (currentIataCodeTo) {
        console.log('Opening a new tab with ', currentIataCodeTo);
        window.open(`https://www.robotize.no/flights?iataCodeTo=${currentIataCodeTo}`, '_blank'); // Open in new tab
    }
});
