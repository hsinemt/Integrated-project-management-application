const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    console.log(`🔹 Étudiants reçus :`, students.map(s => ({
        _id: s._id.toString(),
        name: s.name || 'Non défini'
    })));

    for (let i = 0; i < students.length; i++) {
        console.log(`🔹 Début de la génération de la tâche pour l'étudiant ${i + 1}/${students.length}`);
        const student = students[i];
        const studentName = (student.name && typeof student.name === 'string' && student.name.trim().length > 0)
            ? student.name.trim()
            : `Étudiant ${i + 1}`;

        let task = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && !task) {
            try {
                console.log(`🔹 Tentative ${attempts + 1}/${maxAttempts} pour ${studentName}`);
                const prompt = `Projet : "${enrichedDescription}". Génère une tâche unique pour ${studentName} au format exact : "Nom: ${studentName} - [titre de la tâche], Description: [description], Priorité: [High/Medium/Low]". Utilise ${keyFeatures.join(', ') || 'des éléments généraux'} pour personnaliser la tâche. La tâche doit être différente de celles-ci : ${tasks.map(t => `"${t.name}: ${t.description}"`).join(', ') || 'aucune tâche précédente'}. Ne répète pas les idées déjà utilisées.`;

                console.log(`🔹 Prompt envoyé pour ${studentName}:`, prompt);

                const result = await model.generateContent(prompt);
                const generatedText = result.response.text().trim();

                console.log(`🔹 Texte généré pour ${studentName}:`, generatedText);

                const taskMatch = generatedText.match(/Nom:\s*([^,]+),\s*Description:\s*([\s\S]+?),\s*Priorité:\s*(High|Medium|Low)/i);

                let name, description, priority;

                if (taskMatch) {
                    [, name, description, priority] = taskMatch;
                    console.log(`🔹 Regex match - Name: ${name}, Description: ${description}, Priority: ${priority}`);
                } else {
                    console.log(`❌ Regex failed to match. Attempting fallback parsing...`);
                    const nameMatch = generatedText.match(/Nom:\s*([^,]+),\s*Description:/i);
                    if (!nameMatch) {
                        throw new Error(`Format invalide - Impossible de trouver le champ Nom : ${generatedText}`);
                    }
                    name = nameMatch[1].trim();

                    const descPrioritySplit = generatedText.split(/,\s*Priorité:\s*/i);
                    if (descPrioritySplit.length !== 2) {
                        throw new Error(`Format invalide - Impossible de séparer Description et Priorité : ${generatedText}`);
                    }
                    priority = descPrioritySplit[1].trim();
                    if (!priority.match(/^(High|Medium|Low)$/i)) {
                        throw new Error(`Priorité invalide : ${priority}`);
                    }

                    const descMatch = descPrioritySplit[0].match(/Description:\s*([\s\S]+)/i);
                    if (!descMatch) {
                        throw new Error(`Format invalide - Impossible de trouver le champ Description : ${generatedText}`);
                    }
                    description = descMatch[1].trim();

                    console.log(`🔹 Fallback parsing - Name: ${name}, Description: ${description}, Priority: ${priority}`);
                }

                if (name.includes('[nom') || description.includes('[description')) {
                    throw new Error(`Placeholders détectés : ${generatedText}`);
                }

                let finalName = name.trim();
                let finalDescription = description.trim();

                const objectIdPattern = /^[0-9a-fA-F]{24}$/;
                if (objectIdPattern.test(finalName.split(' ')[0])) {
                    finalName = `${studentName} - ${finalName.split(' - ').slice(1).join(' - ')}`;
                }

                if (!finalName.startsWith(studentName)) {
                    finalName = `${studentName} - ${finalName}`;
                }

                if (finalDescription.length < 15) {
                    throw new Error(`Description trop courte : ${finalDescription}`);
                }

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

                task = {
                    name: finalName.substring(0, 50),
                    description: finalDescription,
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
                // Add a delay to avoid rate limiting
                if (!task) {
                    console.log(`🔹 Attente de 1 seconde avant la prochaine tentative pour éviter les limites de taux...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (!task) {
            console.error(`❌ Aucune tâche générée pour ${studentName} après ${maxAttempts} tentatives.`);
            throw new Error(`Échec de la génération de la tâche pour ${studentName}`);
        }

        tasks.push(task);
        usedNames.add(task.name);
        usedDescriptions.add(task.description);
        console.log(`🔹 Tâche ajoutée pour ${studentName}:`, JSON.stringify(task, null, 2));
    }

    console.log(`🔹 Total tâches générées : ${tasks.length}`);
    return tasks;
}

module.exports = { generateTasks };