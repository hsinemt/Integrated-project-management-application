require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Génère une tâche basée sur la description du projet
 * @param {string} projectDescription - Description du projet
 * @returns {Promise<string>} - Tâche générée
 */
async function generateTask(projectDescription) {
    try {
        const response = await hf.textGeneration({
            model: 'facebook/bart-large-cnn', // Modèle pré-entraîné pour la génération de texte
            inputs: `Génère une tâche pour ce projet : ${projectDescription}`,
            parameters: { max_length: 100 }
        });

        console.log("🔹 Tâche générée par Hugging Face :", response.generated_text); // Log de la tâche générée

        return response.generated_text || "Aucune tâche générée.";
    } catch (error) {
        console.error("Erreur lors de la génération de la tâche :", error);
        return "Erreur lors de la génération.";
    }
}

module.exports = generateTask;
