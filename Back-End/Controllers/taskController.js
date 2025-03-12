const { generateTasks } = require('../services/taskGeneratorService');

exports.generateTasks = async (req, res) => {
    try {
        const { projectId, groupId } = req.params;
        const result = await generateTasks(projectId, groupId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la génération des tâches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
