
const axios = require('axios');
require('dotenv').config();

/**
 * Generate project details from a prompt using OpenAI
 * @param {string} prompt - User's project idea prompt
 * @returns {Promise<Object>} - Generated project details with title, description and keywords
 */
exports.generateProjectFromPrompt = async (prompt) => {
    try {
        if (!prompt || prompt.trim() === '') {
            throw new Error('Prompt is required');
        }

        // Construct the system message for the AI
        const systemMessage = `You are an expert at creating project specifications.
    Based on the user's prompt, generate a detailed project specification with the following structure:
    
    Format your response EXACTLY as JSON with these keys:
    - title: A creative and professional project title
    - description: A comprehensive description of the project (1-3 paragraphs)
    - keywords: An array of relevant keywords (5-10 words/phrases)
    - keyFeatures: An array of 4-6 key features for the project
    
    Do not include any explanations, markdown formatting, or extra text - ONLY return valid JSON.`;


        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );

        const responseText = response.data.choices[0].message.content;

        try {

            const parsedResponse = JSON.parse(responseText);
            return parsedResponse;
        } catch (parseError) {
            console.error("Error parsing AI response as JSON:", parseError);


            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error("Failed to extract JSON with regex:", e);
                }
            }


            return {
                title: "Generated Project",
                description: "A project based on your requirements. (Note: AI formatting error occurred)",
                keywords: ["project", "generated"],
                keyFeatures: ["Feature based on your requirements"]
            };
        }
    } catch (error) {
        console.error("Error calling OpenAI API:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.response?.data?.error?.message || error.message
        });


        throw new Error(`Failed to generate project: ${error.message}`);
    }
};