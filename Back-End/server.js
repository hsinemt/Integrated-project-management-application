const express = require('express');
const app = express();
app.use(express.json());
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');
require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 5000;
const groupRoutes = require('./Routes/groupRoutes');
const choixRoutes = require('./Routes/choixRoutes');
const projectRoutes = require('./Routes/projectRoutes');
app.use(cors({
    origin: 'http://localhost:3000', // Permet uniquement les requêtes venant de ce domaine
    methods: ['GET', 'POST'], // Autorise les méthodes spécifiques
    allowedHeaders: ['Content-Type', 'Authorization'] // Autorise certains en-têtes
  }));

  
app.use('/projects', projectRoutes);

app.use('/groups', groupRoutes);
app.use('/choix', choixRoutes);

app.use(bodyParser.json());
app.use(cors());
app.use('/auth', UserRouter);
app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});

