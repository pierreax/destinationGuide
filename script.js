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

document.getElementById('destinationForm').addEventListener('submit', function(event) {
    event.preventDefault();
    console.log('Form submitted!'); // Logging to check if the event listener is triggered

    // Clear previous suggestions and full response
    document.getElementById('suggestion').innerText = '';
    document.getElementById('fullResponse').innerText = '';

    const loader = document.getElementById('loader');
    loader.style.display = 'block'; // Show the loader

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
            loader.style.display = 'none'; // Hide the loader
            return null;
        }
    })
    .then(response => {
        if (response) {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            console.log('Follow-up Response data:', data); // Logging follow-up response data
            document.getElementById('fullResponse').innerText = data.full_response;
        }
        loader.style.display = 'none'; // Hide the loader
    })
    .catch(error => {
        loader.style.display = 'none'; // Hide the loader
        console.error('Error:', error);
        document.getElementById('suggestion').innerText = 'Error fetching suggestion';
        document.getElementById('fullResponse').innerText = '';
    });
});
