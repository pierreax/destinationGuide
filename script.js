document.getElementById('destinationForm').addEventListener('submit', function(event) {
    event.preventDefault();
    document.getElementById('loader').style.display = 'block'; // Show the loader
    const formData = new FormData(event.target);
    const preferences = {
        destination_type: formData.get('destination_type'),
        activity: formData.get('activity'),
        climate: formData.get('climate'),
        budget: formData.get('budget'),
        month: formData.get('month')
    };

    fetch('https://flightwebsiteapp.azurewebsites.net/api/Destinations?code=Klk7h6hTV10eit9wstlDC2n8mYARisNt9pE61-bXpA9vAzFuxoe4Rw%3D%3D', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
    })
    .then(response => {
        if (!response.ok) {
            document.getElementById('loader').style.display = 'none'; // Hide the loader if validation fails
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.text(); // Get the raw response text
    })
    .then(text => {
        document.getElementById('loader').style.display = 'none'; // Hide the loader
        try {
            const data = JSON.parse(text); // Attempt to parse the JSON
            document.getElementById('suggestion').innerText = data.suggestion;
            document.getElementById('fullResponse').innerText = data.full_response;
        } catch (error) {
            console.error('Error parsing JSON:', error);
            console.error('Response text was:', text);
            document.getElementById('suggestion').innerText = 'Error fetching suggestion';
            document.getElementById('fullResponse').innerText = '';
        }
    })
    .catch(error => {
        document.getElementById('loader').style.display = 'none'; // Hide the loader
        console.error('Error:', error);
        document.getElementById('suggestion').innerText = 'Error fetching suggestion';
        document.getElementById('fullResponse').innerText = '';
    });
});
