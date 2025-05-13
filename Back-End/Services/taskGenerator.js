const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateTasks(projectDescription, students, keywords = []) {
    console.log('🚀 Début de generateTasks...');
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Clé API Gemini manquante dans les variables d\'environnement');
        throw new Error('Clé API Gemini non configurée');
    }

    const tasks = [];
    const usedDescriptions = new Set();
    const usedNames = new Set();

    const validDescription = (projectDescription && typeof projectDescription === 'string' && projectDescription.length >= 10)
        ? projectDescription
        : "Développement d'une plateforme de gestion avec diverses fonctionnalités.";
    const enrichedDescription = `${validDescription}${keywords.length ? `. Mots-clés : ${keywords.join(', ')}.` : '.'}`;

    console.log(`🔹 Génération de ${students.length} tâches`);
    console.log(`🔹 Description utilisée : "${enrichedDescription}"`);
    console.log(`🔹 Étudiants reçus (IDs uniquement):`, students.map(id => id.toString()));

    for (let i = 0; i < students.length; i++) {
        console.log(`🔹 Début de la génération de la tâche pour l'étudiant ${i + 1}/${students.length}`);
        const studentId = students[i];
        const studentName = `Étudiant ${i + 1}`; // Nom générique car pas de peuplement

        let task = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && !task) {
            try {
               // console.log(`🔹 Tentative ${attempts + 1}/${maxAttempts} pour ${studentName}`);
                const prompt = `Projet : "${enrichedDescription}". Génère une tâche unique pour ${studentName} au format exact : "Nom: ${studentName} - [titre de la tâche], Description: [description], Priorité: [High/Medium/Low]". Utilise ${keywords.join(', ') || 'des éléments généraux'} pour personnaliser la tâche. La tâche doit être différente de celles-ci : ${tasks.map(t => `"${t.name}: ${t.description}"`).join(', ') || 'aucune tâche précédente'}. Ne répète pas les idées déjà utilisées.`;

                //console.log(`🔹 Prompt envoyé pour ${studentName}:`, prompt);

                const result = await model.generateContent(prompt);
                const generatedText = result.response.text().trim();

                //console.log(`🔹 Texte généré pour ${studentName}:`, generatedText);

                const taskMatch = generatedText.match(/Nom:\s*([^,]+),\s*Description:\s*([\s\S]+?),\s*Priorité:\s*(High|Medium|Low)/i);

                let name, description, priority;

                if (taskMatch) {
                    [, name, description, priority] = taskMatch;
                    //console.log(`🔹 Regex match - Name: ${name}, Description: ${description}, Priority: ${priority}`);
                } else {
                    throw new Error(`Format invalide - Impossible de parser : ${generatedText}`);
                }

                task = {
                    name: name.trim(),
                    description: description.trim(),
                    priority: priority.trim(),
                    état: 'To Do'
                };
            } catch (error) {
                console.error(`❌ Erreur lors de la génération de la tâche pour ${studentName} (Tentative ${attempts + 1}):`, error.message);
                attempts++;
                if (attempts === maxAttempts) {
                    console.warn(`⚠️ Échec après ${maxAttempts} tentatives pour ${studentName}. Utilisation d'une tâche par défaut.`);
                    task = {
                        name: `${studentName} - Tâche par défaut`,
                        description: `Effectuer une tâche générique pour le projet ${validDescription}.`,
                        priority: 'Medium',
                        état: 'To Do'
                    };
                }
                if (!task) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        tasks.push(task);
        usedNames.add(task.name);
        usedDescriptions.add(task.description);
        console.log(`🔹 Tâche ajoutée pour ${studentName}:`, JSON.stringify(task, null, 2));
    }

    //console.log(`✅ Total tâches générées : ${tasks.length}`);
    return tasks;
}

module.exports = { generateTasks };