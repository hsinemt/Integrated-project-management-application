require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./Routes/authRoutes');

require('./Config/db'); // Connexion à MongoDB
require('./Config/passportConfig'); // Configuration de Passport.js
require('./Config/passportGoogle');
const app = express();

// Configuration de session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Utilisation des routes d'authentification
app.use('/auth', authRoutes);

app.listen(3000, () => {
  console.log('✅ Serveur démarré sur http://localhost:3000');
});
