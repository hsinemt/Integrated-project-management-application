const mongoose = require('mongoose');
const GroupeModel = require('../Models/Group');
const ProjectModel = require('../Models/Project');
const TaskModel = require('../Models/tasks');
const { generateTasks } = require('../services/taskGenerator');

// Helper function to get file extension based on language
const getFileExtension = (language) => {
    switch (language) {
        case 'javascript':
            return '.js';
        case 'typescript':
            return '.ts';
        case 'html':
            return '.html';
        case 'css':
            return '.css';
        case 'json':
            return '.json';
        case 'python':
            return '.py';
        case 'java':
            return '.java';
        case 'csharp':
            return '.cs';
        case 'cpp':
            return '.cpp';
        case 'php':
            return '.php';
        default:
            return '.txt';
    }
};


exports.getTasksByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;
        const user = req.user; // Get the user from the request object

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        // Create a filter object for the query
        const filter = { project: projectId };

        // All users (including students) can see all tasks in a project
        // For admin, tutor, and manager roles, show all tasks (no additional filter needed)

        const tasks = await TaskModel.find(filter)
            .sort({ date: -1 })
            .populate('assignedTo', 'name lastname avatar');

        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching tasks"
        });
    }
};

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

        //console.log('✅ Tâches générées avec succès:', tasksToPreview.length);
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

// Get a task by ID
exports.getTaskById = async (req, res) => {
    const { taskId } = req.params;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    try {
        // Find the task by ID and populate the codeFiles field
        const task = await TaskModel.findById(taskId).populate('codeFiles');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Return the task
        res.status(200).json({
            success: true,
            task
        });
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching task"
        });
    }
};

// Save code to a task (legacy method, now creates a CodeFile)
exports.saveTaskCode = async (req, res) => {
    const { taskId } = req.params;
    const { code, codeLanguage } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    // Validate code and language
    if (code === undefined || code === null || code === '') {
        return res.status(400).json({
            success: false,
            message: "Code is required"
        });
    }

    try {
        // Generate a filename based on task ID and language
        const fileExtension = getFileExtension(codeLanguage);
        const fileName = `task_${taskId}_code${fileExtension}`;

        // Find the task
        const task = await TaskModel.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Check if a file with this name already exists
        const CodeFile = require('../Models/CodeFile');
        let codeFile = await CodeFile.findOne({ taskId, fileName });

        if (codeFile) {
            // Update existing code file
            codeFile.code = code;
            codeFile.language = codeLanguage;
            await codeFile.save();
        } else {
            // Create a new code file
            codeFile = new CodeFile({
                code,
                language: codeLanguage,
                fileName,
                taskId
            });
            await codeFile.save();

            // Add the code file reference to the task
            task.codeFiles.push(codeFile._id);
            await task.save();
        }

        // For backward compatibility, also update the legacy fields
        task.code = code;
        task.codeLanguage = codeLanguage;
        task.codeFileName = fileName;
        await task.save();

        // Return the updated task with populated code files
        const updatedTask = await TaskModel.findById(taskId).populate('codeFiles');

        res.status(200).json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error("Error saving task code:", error);
        res.status(500).json({
            success: false,
            message: "Server error while saving task code"
        });
    }
};

// Add a new code file to a task
exports.addCodeFile = async (req, res) => {
    const { taskId } = req.params;
    const { code, language, fileName } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    // Validate required fields
    if (code === undefined || code === null || code === '' || !language || !fileName) {
        return res.status(400).json({
            success: false,
            message: "Code, language, and fileName are required"
        });
    }

    try {
        // Find the task
        const task = await TaskModel.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Check if a file with the same name already exists
        const CodeFile = require('../Models/CodeFile');
        const existingFile = await CodeFile.findOne({ taskId, fileName });

        if (existingFile) {
            return res.status(400).json({
                success: false,
                message: "A file with this name already exists"
            });
        }

        // Create a new code file
        const newCodeFile = new CodeFile({
            code,
            language,
            fileName,
            taskId
        });

        // Save the code file
        const savedCodeFile = await newCodeFile.save();

        // Add the code file reference to the task
        task.codeFiles.push(savedCodeFile._id);
        await task.save();

        // Return the updated task with populated code files
        const updatedTask = await TaskModel.findById(taskId).populate('codeFiles');

        res.status(200).json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error("Error adding code file to task:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding code file to task"
        });
    }
};

// Delete a code file from a task
exports.deleteCodeFile = async (req, res) => {
    const { taskId, fileName } = req.params;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    try {
        // Find the task
        const task = await TaskModel.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Find the code file
        const CodeFile = require('../Models/CodeFile');
        const codeFile = await CodeFile.findOne({ taskId, fileName });

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        // Delete the code file
        await CodeFile.findByIdAndDelete(codeFile._id);

        // Remove the code file reference from the task
        await TaskModel.findByIdAndUpdate(
            taskId,
            { $pull: { codeFiles: codeFile._id } }
        );

        // Return the updated task with populated code files
        const updatedTask = await TaskModel.findById(taskId).populate('codeFiles');

        res.status(200).json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error("Error deleting code file from task:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting code file from task"
        });
    }
};

// Update a code file in a task
exports.updateCodeFile = async (req, res) => {
    const { taskId, fileName } = req.params;
    const { code, language } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    // Validate required fields
    if (code === '' || (!code && !language)) {
        return res.status(400).json({
            success: false,
            message: "Code cannot be empty, and either code or language must be provided"
        });
    }

    try {
        // Find the task
        const task = await TaskModel.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Find the code file
        const CodeFile = require('../Models/CodeFile');
        const codeFile = await CodeFile.findOne({ taskId, fileName });

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        // Update the code file
        if (code !== undefined) {
            codeFile.code = code;
        }

        if (language !== undefined) {
            codeFile.language = language;
        }

        // Save the updated code file
        await codeFile.save();

        // Return the updated task with populated code files
        const updatedTask = await TaskModel.findById(taskId).populate('codeFiles');

        res.status(200).json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating code file in task:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating code file in task"
        });
    }
};
