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

    fetch('https://flightwebsiteapp.azurewebsites.net/api/Destinations?code=Klk7h6hTV10eit9wstlDC2n8mYARisNt9pE61-bXpA9vAzFuxoe4Rw%3D%3D', {
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
        loader.style.display = 'none'; // Hide the loader

        console.log('Response data:', data); // Logging response data
        
        if (!previousSuggestions.includes(data.suggestion)) {
            previousSuggestions.push(data.suggestion);
            sessionStorage.setItem('previousSuggestions', JSON.stringify(previousSuggestions));

            document.getElementById('suggestion').innerText = data.suggestion;
            document.getElementById('fullResponse').innerText = data.full_response;
        } else {
            document.getElementById('suggestion').innerText = 'Suggestion was already provided. Please try again.';
            document.getElementById('fullResponse').innerText = '';
        }
    })
    .catch(error => {
        loader.style.display = 'none'; // Hide the loader
        console.error('Error:', error);
        document.getElementById('suggestion').innerText = 'Error fetching suggestion';
        document.getElementById('fullResponse').innerText = '';
    });
});
