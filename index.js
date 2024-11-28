// server.js

const express = require('express');
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

// POST route for handling initial suggestion request with streaming
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

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenAI API Error:', errorData);
            throw new Error('Failed to fetch from OpenAI API');
        }

        // Assuming OpenAI sends a single response
        const responseData = await response.json();
        const fullResponse = responseData.choices[0].message.content;
        const [cityCountry, ...rest] = fullResponse.split('\n');
        const fullResponseWithoutCityCountry = rest.join('\n').trim();

        // Set headers for chunked transfer
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Create a readable stream
        const { Readable } = require('stream');
        const stream = new Readable({
            read() {}
        });

        // Push suggestion
        const suggestionChunk = JSON.stringify({ suggestion: cityCountry.trim() }) + '\n';
        stream.push(suggestionChunk);
        res.write(suggestionChunk);

        // Simulate some delay (optional)
        // await new Promise(resolve => setTimeout(resolve, 1000));

        // Push full_response
        const fullResponseChunk = JSON.stringify({ full_response: fullResponseWithoutCityCountry }) + '\n';
        stream.push(fullResponseChunk);
        res.write(fullResponseChunk);

        // End the stream
        stream.push(null);
        res.end();

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error generating response from OpenAI API' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
