// Change 'GoogleGenerativeAI' to 'GoogleGenAI'
import { GoogleGenAI } from '@google/genai';

// The API key is securely accessed from the Vercel Environment Variables
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY); 

// The system prompt and structured schema are now on the server
const systemPrompt = "You are an expert social media content moderator. Your task is to analyse the following user-submitted post (including the username) for violations of community guidelines, specifically focusing on hate speech, harassment, graphic violence, and self-harm content. Assign a safety status (is_safe) and list any categories flagged. Always provide a brief justification in 'moderator_comment'. Always respond strictly in the requested JSON format.";

const responseSchema = {
    type: "OBJECT",
    properties: {
        is_safe: { type: "BOOLEAN", description: "True if the post is compliant with all guidelines (safe), false if any guidelines are violated (flagged)." },
        categories_flagged: { type: "ARRAY", description: "A list of strings containing all high-risk categories detected (e.g., 'Hate Speech', 'Harassment', 'Graphic Violence', 'Self-Harm'). Return an empty array if the post is safe.", items: { type: "STRING" } },
        moderator_comment: { type: "STRING", description: "A brief, concise justification for the safety determination." }
    },
    required: ["is_safe", "categories_flagged", "moderator_comment"],
};


export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // Check for the environment variable
    if (!process.env.GEMINI_API_KEY) {
        return response.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY environment variable is missing.' });
    }

    const { userContent } = request.body;

    if (!userContent) {
        return response.status(400).json({ error: 'Missing userContent in request body.' });
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // You can use gemini-2.5-flash or similar
            contents: [{ parts: [{ text: userContent }] }],
            config: {
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
            return response.status(500).json({ error: "Gemini API returned no structured content." });
        }
        
        // Return the parsed JSON directly to the client
        return response.status(200).json(JSON.parse(jsonText));

    } catch (error) {
        console.error('Gemini API Error:', error);
        return response.status(500).json({ error: `Failed to moderate content: ${error.message}` });
    }
}
