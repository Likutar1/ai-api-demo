// /ai-api-demo/api/moderation.js
import { GoogleGenerativeAI } from "@google/genai";

// API Key is fetched securely from Vercel's environment variables
const apiKey = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenerativeAI(apiKey);

// This is the system instruction defined in your client-side script
const systemPrompt = "You are an expert social media content moderator. Your task is to analyse the following user-submitted post (including the username) for violations of community guidelines, specifically focusing on hate speech, harassment, graphic violence, and self-harm content. Assign a safety status (is_safe) and list any categories flagged. Always provide a brief justification in 'moderator_comment'. Always respond strictly in the requested JSON format.";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Only POST requests allowed' });
    }

    try {
        // Vercel handles body parsing
        const { combinedContent } = req.body; 

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-05-20",
            contents: [{ parts: [{ text: combinedContent }] }],
            config: {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        is_safe: { type: "BOOLEAN" },
                        categories_flagged: { type: "ARRAY", items: { type: "STRING" } },
                        moderator_comment: { type: "STRING" }
                    },
                    required: ["is_safe", "categories_flagged", "moderator_comment"]
                }
            }
        });

        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error("API returned no structured content.");

        res.status(200).json(JSON.parse(jsonText));

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to process moderation request.", details: error.message });
    }
}
