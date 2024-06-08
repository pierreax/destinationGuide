document.getElementById('destinationForm').addEventListener('submit', function(event) {
    event.preventDefault();
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
    .then(response => response.json())
    .then(data => {
        document.getElementById('suggestion').innerText = data.suggestion;
        document.getElementById('fullResponse').innerText = data.full_response;
    })
    .catch(error => console.error('Error:', error));
});
