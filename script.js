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
let cachedAirportData = null;

async function loadAirportsData() {
    if (cachedAirportData) {
        return cachedAirportData;
    }

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

    cachedAirportData = airportData; // Cache the data
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

    // Clear previous full response
    document.getElementById('fullResponse').value = '';
    document.getElementById('fullResponseForm').style.display = 'none';

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

                    // After streaming is complete, extract City and Country from fullResponseText
                    const [firstSentence] = fullResponseText.split('.');
                    if (firstSentence) {
                        const cityCountry = firstSentence.trim();
                        console.log('Extracted City, Country:', cityCountry);

                        // Extract city from "City, Country"
                        const [city, country] = cityCountry.split(',').map(part => part.trim());

                        if (city && country) {
                            // Load airport data to find IATA code
                            loadAirportsData().then(airports => {
                                const matchedAirport = airports.find(airport => airport.city.toLowerCase() === city.toLowerCase());
                                if (matchedAirport) {
                                    currentIataCodeTo = matchedAirport.iata;
                                    console.log('Matched IATA Code:', currentIataCodeTo);
                                    const searchFlightsButton = document.getElementById('searchFlightsButton');
                                    searchFlightsButton.onclick = function() {
                                        window.open(`https://www.robotize.no/flights?iataCodeTo=${currentIataCodeTo}`, '_blank'); // Open in new tab
                                    };
                                    searchFlightsButton.style.display = 'block'; // Show the button
                                } else {
                                    console.warn('No matching airport found for city:', city);
                                }
                            });
                        }
                    }
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
    if (currentIataCodeTo) {
        console.log('Opening a new tab with ', currentIataCodeTo);
        window.open(`https://www.robotize.no/flights?iataCodeTo=${currentIataCodeTo}`, '_blank'); // Open in new tab
    }
});
