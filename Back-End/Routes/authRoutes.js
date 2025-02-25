const express = require('express');
const passport = require('passport');
const User = require('../Models/user'); // Importer le modèle User

const router = express.Router();

// Route pour démarrer l'authentification GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Route de callback après authentification GitHub
router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard'); // Redirection après connexion
  }
);


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);
// Nouvelle route pour obtenir les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

router.delete('/delete-null-github', async (req, res) => {
  try {
      const result = await User.deleteMany({ githubId: null });
      res.json({ message: `✅ ${result.deletedCount} utilisateurs supprimés.` });
  } catch (err) {
      res.status(500).json({ error: '❌ Erreur lors de la suppression.' });
  }
});

module.exports = router;