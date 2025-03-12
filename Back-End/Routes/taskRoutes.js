const express = require('express');
const router = express.Router();
const Task = require('../Models/tasks'); // Modèle Task
const Group = require('../Models/Group'); // Modèle Groupe
const Project = require('../Models/Project'); // ✅ Ajout du modèle Project
const generateTask = require('../services/taskGenerator'); // Fichier pour générer une tâche IA

// taskRoutes.js
router.post('/generate', async (req, res) => {
    try {
        console.log("🔹 Requête reçue :", req.body); // ✅ Debugging

        const { projectId, groupId } = req.body;
        
        // ✅ Vérification des paramètres
        if (!projectId || !groupId) {
            return res.status(400).json({ error: "Les champs projectId et groupId sont obligatoires" });
        }

        console.log("🔹 projectId reçu :", projectId); // Ajout d'un log pour vérifier l'ID du projet

        // 📌 Vérifier si le groupe existe
        const group = await Group.findById(groupId).populate('id_students');
        if (!group) return res.status(404).json({ error: "Groupe non trouvé" });

        // 📌 Vérifier si le projet existe
        const projects = await Projects.findById(projectId);
        if (!projects) return res.status(404).json({ error: "Projet non trouvé" });

        console.log("🔹 Projet trouvé :", projects); // Log pour vérifier le projet trouvé

        // 📌 Vérifier que le groupe contient des étudiants
        if (!group.id_students || group.id_students.length === 0) {
            return res.status(400).json({ error: "Aucun étudiant dans ce groupe" });
        }

        // 🔹 Générer une tâche avec IA
        const generatedTask = await generateTask(project.description);

        // 🔹 Assigner la tâche à un étudiant au hasard
        const assignedStudent = group.id_students[Math.floor(Math.random() * group.id_students.length)];

        // 📌 Création et sauvegarde de la tâche en base de données
        const task = new Task({
            name: `Tâche pour ${projects.title}`,
            description: generatedTask,
            priority: 'Medium',
            date: new Date(),
            état: 'To Do',
            project: projectId,
            group: groupId,
            assignedTo: assignedStudent._id
        });

        await task.save();
        res.status(201).json({ message: "Tâche générée avec succès", task });

    } catch (error) {
        console.error("❌ Erreur lors de la génération :", error);
        res.status(500).json({ error: "Erreur interne du serveur", details: error.message });
    }
});


module.exports = router;
