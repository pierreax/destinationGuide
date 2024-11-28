// server.js

const express = require('express');
const path = require('path');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON requests
app.use(express.json());

// Use compression middleware to enable res.flush()
app.use(compression());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Send index.html file for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST route for handling suggestion requests with streaming
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
        // Make a streaming request to OpenAI
        const openaiResponse = await fetch(openaiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ],
                stream: true // Enable streaming
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.text();
            console.error('OpenAI API Error:', errorData);
            return res.status(500).json({ error: 'Failed to fetch from OpenAI API' });
        }

        // Set headers for chunked transfer
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Listen to OpenAI's streamed response
        const reader = openaiResponse.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        // Helper function to send parsed data to the client
        const sendData = (data) => {
            res.write(JSON.stringify(data) + '\n');
            if (res.flush) {
                res.flush(); // Flush the response to ensure immediate delivery
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split the buffer by newline to process each event
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Save the last incomplete line

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace(/^data: /, '').trim();
                    if (dataStr === '[DONE]') {
                        // End of stream
                        res.end();
                        return;
                    }

                    try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices[0].delta.content;

                        if (content) {
                            // Check if it's the first line (suggestion)
                            if (!res.locals.suggestionSent) {
                                const suggestion = content.trim();
                                sendData({ suggestion });
                                res.locals.suggestionSent = true;
                            } else {
                                // Append to full_response
                                if (!res.locals.fullResponse) {
                                    res.locals.fullResponse = '';
                                }
                                res.locals.fullResponse += content;
                                sendData({ full_response: res.locals.fullResponse.trim() });
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing OpenAI stream chunk:', err);
                    }
                }
            }
        }

        // After stream ends
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
