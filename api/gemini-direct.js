// This file is your new backend, running on Vercel's servers.
// It will receive the fetch request from your index.html file.

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { prompt, systemPrompt, tools, generationConfig } = request.body;
    
    // Get your secret Gemini API key from Vercel's Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set on the server.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // Construct the payload for the Google AI API
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }
    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }
    if (generationConfig) {
      payload.generationConfig = generationConfig;
    }

    console.log('Calling Gemini API with payload:', JSON.stringify(payload, null, 2));

    // Call the actual Google Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Google AI Error:", errorText);
      throw new Error(`Google AI API failed with status ${geminiResponse.status}: ${errorText}`);
    }

    const result = await geminiResponse.json();

    // Send the successful response back to your index.html
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Check if the response was JSON (from schema) or plain text
    if (generationConfig?.responseMimeType === "application/json") {
        try {
            const jsonContent = JSON.parse(text);
            console.log('Successfully parsed JSON response:', jsonContent);
            response.status(200).json({ content: jsonContent });
        } catch (e) {
            console.error('Failed to parse JSON response:', text);
            throw new Error('Invalid JSON response from Gemini API');
        }
    } else {
        console.log('Returning text response:', text?.substring(0, 100) + '...');
        response.status(200).json({ content: text });
    }

  } catch (error) {
    console.error("Error in /api/gemini handler:", error.message);
    // Send a detailed error back to the browser
    response.status(500).json({ error: error.message });
  }
}