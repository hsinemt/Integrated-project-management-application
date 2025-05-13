const mongoose = require('mongoose');
const GroupeModel = require('../Models/Group');
const ProjectModel = require('../Models/Project');
const TaskModel = require('../Models/tasks');
const { generateTasks } = require('../Services/taskGenerator');

exports.previewTasks = async (req, res) => {
    try {
        console.log('📥 Requête reçue pour previewTasks:', req.body);
        const { projectId, groupId } = req.body;

        if (!projectId || !groupId) {
            console.error('❌ projectId ou groupId manquant:', { projectId, groupId });
            return res.status(400).json({ 
                success: false, 
                message: 'projectId et groupId sont requis' 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(groupId)) {
            console.error('❌ IDs invalides:', { projectId, groupId });
            return res.status(400).json({
                success: false,
                message: 'projectId ou groupId invalide (doit être un ObjectId valide)'
            });
        }

        console.log('🔍 Recherche du groupe:', groupId);
        const group = await GroupeModel.findById(groupId); // Suppression de .populate('id_students')
        console.log('🔍 Recherche du projet:', projectId);
        const project = await ProjectModel.findById(projectId);

        if (!group || !project) {
            console.error('❌ Groupe ou projet non trouvé:', { group: !!group, project: !!project });
            return res.status(404).json({ 
                success: false, 
                message: 'Groupe ou projet non trouvé' 
            });
        }

        if (!group.id_students || group.id_students.length === 0) {
            console.error('❌ Aucun étudiant dans le groupe:', group.nom_groupe);
            return res.status(400).json({ 
                success: false, 
                message: 'Aucun étudiant dans le groupe' 
            });
        }

        console.log(`🔹 Groupe: ${group.nom_groupe}, Étudiants: ${group.id_students.length}`);
        console.log(`🔹 Projet: ${project.title}, Description: ${project.description || 'Non définie'}`);
        console.log(`🔹 Détails des étudiants (IDs uniquement):`, group.id_students.map(id => id.toString()));

        console.log('🚀 Appel à generateTasks...');
        const generatedTasks = await generateTasks(project.description, group.id_students, project.keywords || []);

        if (!generatedTasks || generatedTasks.length !== group.id_students.length) {
            console.error('❌ Nombre de tâches incorrect:', { generated: generatedTasks?.length, expected: group.id_students.length });
            throw new Error(`Nombre de tâches générées (${generatedTasks?.length || 0}) ne correspond pas au nombre d'étudiants (${group.id_students.length})`);
        }

        const tasksToPreview = group.id_students.map((studentId, index) => {
            const task = generatedTasks[index];
            return {
                name: task.name,
                description: task.description,
                priority: task.priority,
                état: task.état,
                assignedTo: studentId.toString(), // Utilisation de l'ID brut
                project: projectId,
                group: groupId,
                date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString()
            };
        });

        console.log('✅ Tâches générées avec succès:', tasksToPreview.length);
        return res.status(200).json({
            success: true,
            message: `${tasksToPreview.length} tâches générées pour prévisualisation`,
            tasks: tasksToPreview
        });

    } catch (error) {
        console.error('❌ Erreur dans previewTasks:', error.stack);
        return res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la génération des tâches: ' + error.message 
        });
    }
};

// exports.saveTasks reste inchangé
exports.saveTasks = async (req, res) => {
    try {
        const { tasks } = req.body;

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'La liste des tâches est requise et doit être un tableau non vide' 
            });
        }

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