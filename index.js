const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Send index.html file for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SSE route for continuous streaming (GET)
app.get('/stream-suggestions', async (req, res) => {
    // Retrieve preferences sent as query parameters
    const preferences = req.query.preferences ? JSON.parse(req.query.preferences) : {};

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Log that we're streaming the data
    console.log('Starting SSE stream');

    // Simulate an initial suggestion
    res.write('data: {"suggestion": "Initial suggestion from server"}\n\n');

    // Simulate sending further data (e.g., full response after 2 seconds)
    setTimeout(() => {
        res.write('data: {"full_response": "Detailed explanation after city/country"}\n\n');
        res.end();  // End the stream after sending full response
    }, 2000);  // Wait 2 seconds before sending the full response
});

// POST route for handling initial suggestion request
app.post('/suggest-destination', async (req, res) => {
    const preferences = req.body.preferences;
    const previousSuggestions = req.body.previousSuggestions || [];

    if (!preferences) {
        return res.status(400).json({ error: 'Request body or preferences are missing' });
    }

    const prompt = `Suggest a travel destination based on the following preferences. Start the response with the city and country name in the format 'City, Country'. Follow this with a detailed explanation but do not repeat the city and country in the explanation. Do not suggest any of the following destinations: ${previousSuggestions.join(', ')}.\n` +
                   `Destination type: ${preferences.destination_type}\n` +
                   `Activities: ${preferences.activity}\n` +
                   `Climate: ${preferences.climate}\n` +
                   `Budget: ${preferences.budget}\n` +
                   `Month: ${preferences.month}`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const openaiEndpoint = 'https://api.openai.com/v1/chat/completions';

    try {
        // Make API request to OpenAI (GPT-4)
        const response = await fetch(openaiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error('Failed to fetch from OpenAI API');
        }

        // Split the response and send initial suggestion and full response separately
        const fullResponse = responseData.choices[0].message.content;
        const [cityCountry, ...rest] = fullResponse.split('\n');
        const fullResponseWithoutCityCountry = rest.join('\n').trim();

        // Send the city and country suggestion
        res.json({ suggestion: cityCountry.trim(), full_response: fullResponseWithoutCityCountry });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error generating response from OpenAI API' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
