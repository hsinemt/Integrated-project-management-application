const GroupeModel = require('../models/Group');
const ProjectModel = require('../models/Project');
const TaskModel = require('../Models/tasks');
const { generateTasks } = require('../services/taskGenerator');

exports.generateTasks = async (req, res) => {
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

        const generatedTasks = await generateTasks(project.description, group.id_students, project.keyFeatures);

        if (generatedTasks.length !== group.id_students.length) {
            throw new Error(`Nombre de tâches générées (${generatedTasks.length}) ne correspond pas au nombre d'étudiants (${group.id_students.length})`);
        }

        const tasksToSave = group.id_students.map((student, index) => {
            const task = generatedTasks[index];
            return {
                name: task.name,
                description: task.description,
                priority: task.priority,
                date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
                état: task.état,
                project: projectId,
                group: groupId,
                assignedTo: student._id
            };
        });

        const savedTasks = await TaskModel.insertMany(tasksToSave);

        return res.status(201).json({
            success: true,
            message: `${savedTasks.length} tâches générées avec succès (une par étudiant)`,
            tasks: savedTasks
        });

    } catch (error) {
        console.error('❌ Erreur dans generateTasks:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur: ' + error.message 
        });
    }
};