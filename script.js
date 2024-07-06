document.addEventListener('DOMContentLoaded', function() {
    var inputs = document.querySelectorAll('input, select');
    inputs.forEach(function(input) {
        input.addEventListener('focus', function() {
            input.previousElementSibling.classList.add('active');
        });

        input.addEventListener('blur', function() {
            if (!input.value) {
                input.previousElementSibling.classList.remove('active');
            }
        });

        // Initial check to float label if input has value
        if (input.value) {
            input.previousElementSibling.classList.add('active');
        }
    });
});

async function loadAirportsData() {
    const response = await fetch('airports.txt');
    const text = await response.text();
    const airportLines = text.split('\n');
    const airportData = {};

    airportLines.forEach(line => {
        const [iata, city] = line.split(' - ');
        if (iata && city) {
            airportData[city.trim()] = iata.trim();
        }
    });

    return airportData;
}

function resizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

document.getElementById('destinationForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    console.log('Form submitted!'); // Logging to check if the event listener is triggered

    // Clear previous suggestions and full response
    document.getElementById('suggestion').innerText = '';
    document.getElementById('fullResponse').innerText = '';
    document.getElementById('fullResponseForm').style.display = 'none';
    document.getElementById('additionalInfoHeader').style.display = 'none';
    document.getElementById('generateInfoHeader').style.display = 'none';

    const loader = document.getElementById('loader');
    loader.style.display = 'block'; // Show the loader

    const submitButton = event.target.querySelector('button[type="submit"]');

    const formData = new FormData(event.target);
    const preferences = {
        destination_type: formData.get('destination_type'),
        activity: formData.get('activity'),
        climate: formData.get('climate'),
        budget: formData.get('budget'),
        month: formData.get('month')
    };

    console.log('Preferences:', preferences); // Logging preferences

    let previousSuggestions = JSON.parse(sessionStorage.getItem('previousSuggestions')) || [];
    
    const requestBody = {
        preferences: preferences,
        previousSuggestions: previousSuggestions
    };

    console.log('Request Body:', requestBody); // Logging the request body

    // First request to get city and country
    fetch('https://flightwebsiteapp.azurewebsites.net/api/destinationsCityCountry?code=_7ndc8Y-t5DFhdw0iljB1u5aKl6Y-R4M_WgOB_pXMxL5AzFuJm_40Q%3D%3D', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            loader.style.display = 'none'; // Hide the loader if validation fails
            submitButton.innerText = 'Get Suggestion'; // Revert button text
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json(); // Get the JSON response
    })
    .then(data => {
        console.log('Initial Response data:', data); // Logging initial response data

        if (!previousSuggestions.includes(data.suggestion)) {
            previousSuggestions.push(data.suggestion);
            sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

            document.getElementById('suggestion').innerText = data.suggestion;
            loader.style.display = 'none'; // Hide the loader

            // Change button text after displaying city and country
            submitButton.innerText = 'Suggest Something Else';

            // Show the additional information headers
            document.getElementById('additionalInfoHeader').style.display = 'block';
            document.getElementById('generateInfoHeader').style.display = 'block';

            // Load the airport data to create the link dynamically
            loadAirportsData().then(airportData => {
                const suggestion = data.suggestion.split(",")[0].trim(); // Extract the city from the suggestion
                const iataCodeTo = airportData[suggestion];
                if (iataCodeTo) {
                    const searchFlightsButton = document.getElementById('searchFlightsButton');
                    searchFlightsButton.onclick = function() {
                        window.open(`https://www.robotize.no/flights?iataCodeTo=${iataCodeTo}`, '_blank'); // Open in new tab
                    };
                    searchFlightsButton.style.display = 'block'; // Show the button
                }
            });

            // Follow-up request for full explanation
            const followUpRequestBody = {
                cityCountry: data.suggestion,
                preferences: preferences
            };

            return fetch('https://flightwebsiteapp.azurewebsites.net/api/destinationsFullExplanation?code=rAK_wIArJb_VelW8sVILecWGSD8oFj-mdhaKljLtLedLAzFukWLJ6A%3D%3D', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(followUpRequestBody)
            });
        } else {
            document.getElementById('suggestion').innerText = 'Suggestion was already provided. Please try again.';
            document.getElementById('fullResponse').innerText = '';
            submitButton.innerText = 'Get Suggestion'; // Revert button text
            loader.style.display = 'none'; // Hide the loader
            return null;
        }
    })
    .then(response => {
        if (response) {
            if (!response.ok) {
                submitButton.innerText = 'Get Suggestion'; // Revert button text
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            console.log('Follow-up Response data:', data); // Logging follow-up response data
            const fullResponseTextarea = document.getElementById('fullResponse');
            fullResponseTextarea.value = data.full_response;
            document.getElementById('fullResponseForm').style.display = 'block'; // Show the full response form
            resizeTextarea(fullResponseTextarea); // Resize the textarea to fit content
        }
        loader.style.display = 'none'; // Hide the loader
    })
    .catch(error => {
        loader.style.display = 'none'; // Hide the loader
        console.error('Error:', error);
        document.getElementById('suggestion').innerText = 'Error fetching suggestion';
        document.getElementById('fullResponse').innerText = '';
        submitButton.innerText = 'Get Suggestion'; // Revert button text
    });
});
