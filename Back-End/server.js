require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const authRoutes = require('./Routes/authRoutes');
const taskRoutes = require('./Routes/taskRoutes');

const app = express();

// Sécurité avec Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
        }
    }
}));

// CORS - Autoriser plusieurs origines
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:3001'], // Ajout de localhost:3001
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware JSON et URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://hsinemtiraoui:1899@cluster0.32ybj.mongodb.net/ipm?retryWrites=true&w=majority&appName=Cluster0&ssl=true', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connecté à MongoDB');
}).catch((error) => {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
});

// Chargement des modèles
require('./Models/user');
require('./models/Group');
require('./models/Project');
require('./Models/tasks');

// Configuration Passport.js
require('./config/passportConfig');
require('./config/passportGoogle');

// Sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // À mettre à true en production avec HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes API
app.use('/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Route pour récupérer tous les projets
app.get('/api/projects', async (req, res) => {
    try {
        const Project = mongoose.model('Projects');
        const projects = await Project.find();
        res.status(200).json(projects);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des projets :", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des projets', error: error.message });
    }
});

// Route pour récupérer tous les groupes
app.get('/api/groups', async (req, res) => {
    try {
        const Group = mongoose.model('Groups');
        const groups = await Group.find();
        res.status(200).json(groups);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des groupes :", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des groupes', error: error.message });
    }
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur :', err.message);
    res.status(500).json({ success: false, error: err.message });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});