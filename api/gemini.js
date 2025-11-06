const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure Generative AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGemini(prompt, systemPrompt, tools = [], generationConfig = {}) {
    try {
        // Get the generative model (default to gemini-pro)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Construct the chat
        const chat = model.startChat({
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                ...generationConfig
            },
            tools: tools
        });

        // Send the message with both system prompt and user prompt
        const result = await chat.sendMessage([
            { role: 'user', content: systemPrompt },
            { role: 'user', content: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        // If JSON response is expected, parse it
        if (generationConfig.responseMimeType === 'application/json') {
            try {
                return { content: JSON.parse(text), error: null };
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                return { content: null, error: 'Invalid JSON response from AI' };
            }
        }

        // Return text response
        return { content: text, error: null };
    } catch (error) {
        console.error('Gemini API error:', error);
        return { content: null, error: error.message || 'Failed to get AI response' };
    }
}

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, systemPrompt, tools, generationConfig } = req.body;

        // Validate required fields
        if (!prompt || !systemPrompt) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Call Gemini API
        const result = await callGemini(prompt, systemPrompt, tools, generationConfig);

        // Return response
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        return res.status(200).json({ content: result.content });
    } catch (error) {
        console.error('API route error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};