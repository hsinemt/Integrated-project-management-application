const { Configuration, OpenAIApi } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

// Configure OpenAI
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Service for handling code reviews with OpenAI
 */
const codeReviewService = {
    /**
     * Assess code quality using OpenAI
     * @param {string} code - The student's code to assess
     * @param {string} language - Programming language of the code
     * @param {object} criteria - Assessment criteria to use
     * @returns {object} Assessment results
     */
    assessCode: async (code, language, criteria = {}) => {
        try {
            // Generate prompt for OpenAI
            const prompt = generateAssessmentPrompt(code, language, criteria);

            // Call OpenAI API
            const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo", // or your preferred model
                messages: [
                    {
                        role: "system",
                        content: "You are an expert programming instructor who evaluates code quality and provides constructive feedback."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2, // Lower temperature for more consistent evaluations
                response_format: { type: "json_object" }
            });

            // Parse and return the assessment
            const assessmentResult = JSON.parse(response.data.choices[0].message.content);
            return assessmentResult;
        } catch (error) {
            console.error('Error assessing code with OpenAI:', error);
            throw new Error('Failed to assess code with AI');
        }
    }
};

/**
 * Generate a detailed prompt for the OpenAI model
 * @param {string} code - The code to evaluate
 * @param {string} language - Programming language of the code
 * @param {object} criteria - Specific criteria for evaluation
 * @returns {string} Generated prompt for OpenAI
 */
function generateAssessmentPrompt(code, language, criteria = {}) {
    // Default evaluation criteria if not specified
    const defaultCriteria = {
        correctness: true,
        efficiency: true,
        readability: true,
        documentation: true,
        bestPractices: true
    };

    const evaluationCriteria = { ...defaultCriteria, ...criteria };

    // Build the prompt
    return `
You are an expert programming instructor tasked with evaluating student code. Analyze the following ${language} code and provide a detailed evaluation:

CODE:
\`\`\`${language}
${code}
\`\`\`

Evaluate the code based on the following criteria:
${evaluationCriteria.correctness ? '- Correctness: Does the code work as expected without logical errors?' : ''}
${evaluationCriteria.efficiency ? '- Efficiency: Is the code optimized and efficient?' : ''}
${evaluationCriteria.readability ? '- Readability: Is the code easy to read and understand?' : ''}
${evaluationCriteria.documentation ? '- Documentation: Is the code well-commented and documented?' : ''}
${evaluationCriteria.bestPractices ? '- Best Practices: Does the code follow industry best practices?' : ''}

For each criterion that applies, provide a score out of 4 points and brief justification.

After evaluating each criterion, calculate a final score out of 20.

Format your response as a JSON object with the following structure:
{
  "criteria": {
    "correctness": { "score": number, "feedback": "string" },
    "efficiency": { "score": number, "feedback": "string" },
    "readability": { "score": number, "feedback": "string" },
    "documentation": { "score": number, "feedback": "string" },
    "bestPractices": { "score": number, "feedback": "string" }
  },
  "overallFeedback": "string",
  "score": number
}
`;
}

module.exports = codeReviewService;