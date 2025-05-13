// Simule une IA gratuite qui génère des tâches à partir d'une description
const generateTasksWithAI = (description) => {
    try {
        // Diviser la description en phrases
        const sentences = description.split('.').filter(s => s.trim().length > 0);
        
        // Générer des tâches basées sur les phrases
        const tasks = sentences.map((sentence, index) => {
            const trimmed = sentence.trim();
            const priority = index === 0 ? 'High' : index < 3 ? 'Medium' : 'Low';
            
            return {
                name: `Tâche ${index + 1}: ${trimmed.substring(0, 30)}...`,
                description: trimmed,
                priority,
                état: 'To Do'
            };
        });

        // Si la description est vide, générer des tâches par défaut
        if (tasks.length === 0) {
            tasks.push({
                name: 'Tâche initiale',
                description: 'Démarrer le projet',
                priority: 'High',
                état: 'To Do'
            });
        }

        return tasks;
    } catch (error) {
        throw new Error('Erreur lors de la génération des tâches par IA');
    }
};

module.exports = { generateTasksWithAI };