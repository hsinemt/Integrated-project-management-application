require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { HfInference } = require('@huggingface/inference');
const Project = require('./Models/Project'); // Assurez-vous que le chemin est correct

const authRoutes = require('./Routes/authRoutes');
const taskRoutes = require('./Routes/taskRoutes');

const app = express();

// 🔹 Sécurité avec Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
        }
    }
}));

// 🔹 CORS : Autoriser le front-end à se connecter
app.use(cors({ 
    origin: "http://localhost:5173", 
    credentials: true 
}));

// 🔹 Middleware JSON et URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://hsinemtiraoui:1899@cluster0.32ybj.mongodb.net/ipm?retryWrites=true&w=majority&appName=Cluster0&ssl=true', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connecté à MongoDB');
}).catch((error) => {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
});

// 🔹 Chargement des modèles MongoDB
require('./Models/user'); 
require('./Models/Group');
    require('./Models/Project');
require('./Models/tasks');

// 🔹 Configuration Passport.js
require('./Config/passportConfig');
require('./Config/passportGoogle');

// 🔹 Sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// 🔹 Initialisation de l'API Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);


app.get('/api/projects', async (req, res) => {
    try {
        const projects = await ProjectModel.find();  // Utilisez ProjectModel ici
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des projets', error: error.message });
    }
});


// 🔹 Route pour générer des tâches avec l'IA Hugging Face
app.post('/api/tasks/generate', async (req, res) => {
    try {
        const { groupId, projectId } = req.body;

        if (!groupId || !projectId) {
            return res.status(400).json({ message: 'GroupId et ProjectId sont requis' });
        }

        // Importation des modèles
        const Task = mongoose.model('Task');
        const Group = mongoose.model('Groupes');
        const Projects = mongoose.model('Projects');

        // Vérification des données
        const project = await Projects.findById(projectId);
        const group = await Group.findById(groupId).populate('id_students');

        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        if (!group) {
            return res.status(404).json({ message: 'Groupe non trouvé' });
        }

        const students = group.id_students;
        if (students.length === 0) {
            return res.status(400).json({ message: 'Aucun étudiant dans le groupe' });
        }

        const tasks = [];

        for (let student of students) {
            try {
                // 🔹 Générer une tâche avec Hugging Face
                const response = await hf.textGeneration({
                    model: "mrm8488/t5-base-finetuned-task-generation",
                    inputs: `Génère une tâche pour le projet : ${project.description}`
                });

                const taskDescription = response.generated_text || "Tâche générée automatiquement.";

                // 🔹 Création et sauvegarde de la tâche
                const newTask = new Task({
                    name: `Tâche pour ${student._id}`,
                    description: taskDescription,
                    priority: 'Medium',
                    date: new Date(),
                    état: 'To Do',
                    assignedTo: student._id,
                    project: project._id,
                    group: group._id
                });

                await newTask.save();
                tasks.push(newTask);
            } catch (huggingFaceError) {
                console.error("⚠️ Erreur API Hugging Face :", huggingFaceError);
            }
        }

        if (tasks.length === 0) {
            return res.status(500).json({ message: 'Aucune tâche n’a pu être générée' });
        }

        res.status(201).json({ message: 'Tâches générées avec succès', tasks });

    } catch (error) {
        console.error("❌ Erreur lors de la génération des tâches :", error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

// 🔹 Routes API
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

// 🔹 Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur :', err.message);
    res.status(500).json({ success: false, error: err.message });
});

// 🔹 Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
