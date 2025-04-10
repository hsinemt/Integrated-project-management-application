const GroupeModel = require('../models/Group');
const ProjectModel = require('../models/Project');
const TaskModel = require('../Models/tasks');
const { generateTasks } = require('../services/taskGenerator');

// Endpoint to generate tasks and return them for review (preview)
exports.previewTasks = async (req, res) => {
    try {
        const { projectId, groupId } = req.body;

        if (!projectId || !groupId) {
            return res.status(400).json({ 
                success: false, 
                message: 'projectId et groupId sont requis' 
            });
        }

        const group = await GroupeModel.findById(groupId).populate('id_students');
        const project = await ProjectModel.findById(projectId);

        if (!group || !project) {
            return res.status(404).json({ 
                success: false, 
                message: 'Groupe ou projet non trouvé' 
            });
        }

        if (!group.id_students || group.id_students.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Aucun étudiant dans le groupe' 
            });
        }

        console.log(`🔹 Groupe: ${group.nom_groupe}, Étudiants: ${group.id_students.length}`);
        console.log(`🔹 Projet: ${project.title}, Description: ${project.description || 'Non définie'}`);
        console.log(`🔹 Détails des étudiants:`, group.id_students.map(s => ({
            _id: s._id.toString(),
            name: s.name || 'Non défini'
        })));

        const generatedTasks = await generateTasks(project.description, group.id_students, project.keyFeatures);

        if (generatedTasks.length !== group.id_students.length) {
            throw new Error(`Nombre de tâches générées (${generatedTasks.length}) ne correspond pas au nombre d'étudiants (${group.id_students.length})`);
        }

        // Map the generated tasks with additional metadata (student ID, project ID, group ID)
        const tasksToPreview = group.id_students.map((student, index) => {
            const task = generatedTasks[index];
            return {
                name: task.name,
                description: task.description,
                priority: task.priority,
                état: task.état,
                assignedTo: student._id.toString(),
                project: projectId,
                group: groupId,
                date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString()
            };
        });

        return res.status(200).json({
            success: true,
            message: `${tasksToPreview.length} tâches générées pour prévisualisation`,
            tasks: tasksToPreview
        });

    } catch (error) {
        console.error('❌ Erreur dans previewTasks:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur: ' + error.message 
        });
    }
};

// Endpoint to save the updated tasks
exports.saveTasks = async (req, res) => {
    try {
        const { tasks } = req.body;

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'La liste des tâches est requise et doit être un tableau non vide' 
            });
        }

        // Validate each task
        const tasksToSave = tasks.map(task => {
            if (!task.name || !task.description || !task.priority || !task.état || !task.assignedTo || !task.project || !task.group) {
                throw new Error('Tous les champs de la tâche sont requis (name, description, priority, état, assignedTo, project, group)');
            }
            return {
                name: task.name,
                description: task.description,
                priority: task.priority,
                état: task.état,
                assignedTo: task.assignedTo,
                project: task.project,
                group: task.group,
                date: task.date ? new Date(task.date) : new Date()
            };
        });

        const savedTasks = await TaskModel.insertMany(tasksToSave);

        return res.status(201).json({
            success: true,
            message: `${savedTasks.length} tâches enregistrées avec succès`,
            tasks: savedTasks
        });

    } catch (error) {
        console.error('❌ Erreur dans saveTasks:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur: ' + error.message 
        });
    }
};