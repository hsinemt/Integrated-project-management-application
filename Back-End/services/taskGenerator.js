const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Niveau gratuit

async function generateTasks(projectDescription, students, keyFeatures = []) {
    const tasks = [];
    const usedDescriptions = new Set();
    const usedNames = new Set();

    const validDescription = (projectDescription && typeof projectDescription === 'string' && projectDescription.length >= 10)
        ? projectDescription
        : "Développement d'une plateforme de gestion avec diverses fonctionnalités.";
    const enrichedDescription = `${validDescription}${keyFeatures.length ? `. Caractéristiques clés : ${keyFeatures.join(', ')}.` : '.'}`;

    console.log(`🔹 Génération de ${students.length} tâches`);
    console.log(`🔹 Description utilisée : "${enrichedDescription}"`);
    console.log(`🔹 Étudiants reçus :`, students.map(s => s._id.toString()));

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const studentName = student.name || `Étudiant ${student._id}`;

        // Prompt amélioré avec consigne d'unicité
        const prompt = `Projet : "${enrichedDescription}". Génère une tâche unique pour ${studentName} au format exact : "Nom: [nom], Description: [description], Priorité: [High/Medium/Low]". Utilise ${keyFeatures.join(', ') || 'des éléments généraux'} pour personnaliser la tâche. La tâche doit être différente de celles-ci : ${tasks.map(t => `"${t.name}: ${t.description}"`).join(', ') || 'aucune tâche précédente'}. Ne répète pas les idées déjà utilisées.`;

        console.log(`🔹 Prompt envoyé pour ${studentName}:`, prompt);

        const result = await model.generateContent(prompt);
        const generatedText = result.response.text().trim();

        console.log(`🔹 Texte généré pour ${studentName}:`, generatedText);

        const taskMatch = generatedText.match(/Nom:\s*([^[\]]+?),\s*Description:\s*([^[\]]+?),\s*Priorité:\s*(High|Medium|Low)/i);
        if (!taskMatch || taskMatch[1].includes('[nom') || taskMatch[2].includes('[description')) {
            throw new Error(`Format invalide ou placeholders détectés : ${generatedText}`);
        }

        const [, name, description, priority] = taskMatch;
        let finalName = name.trim();
        let finalDescription = description.trim();

        if (finalDescription.length < 15) {
            throw new Error(`Description trop courte : ${finalDescription}`);
        }

        // Vérification stricte pour éviter les descriptions similaires
        const isTooSimilar = Array.from(usedDescriptions).some(used => {
            const similarity = finalDescription.toLowerCase().includes(used.toLowerCase().slice(0, 30));
            return similarity;
        });
        if (isTooSimilar) {
            throw new Error(`Description trop similaire à une tâche précédente : ${finalDescription}`);
        }

        if (usedDescriptions.has(finalDescription)) {
            finalDescription += ` (${studentName})`;
        }
        if (usedNames.has(finalName)) {
            finalName += ` ${i + 1}`;
        }

        const task = {
            name: finalName.substring(0, 50),
            description: finalDescription,
            priority: priority.trim(),
            état: 'To Do'
        };

        tasks.push(task);
        usedNames.add(finalName);
        usedDescriptions.add(finalDescription);
        console.log(`🔹 Tâche ajoutée pour ${studentName}:`, JSON.stringify(task, null, 2));
    }

    console.log(`🔹 Total tâches générées : ${tasks.length}`);
    return tasks;
}

module.exports = { generateTasks };