const express = require('express');
const passport = require('passport');
const User = require('../Models/User');

const router = express.Router();

// Route pour démarrer l'authentification GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Route de callback après authentification GitHub
router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    res.redirect('http://localhost:3000/index'); // Redirect to frontend
  }
);

// Route pour démarrer l'authentification Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route de callback après authentification Google
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    res.redirect('http://localhost:3000/index'); // Redirect to frontend
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

// Nouvelle route pour vérifier l'authentification
router.get('/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true, user: req.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Route pour se déconnecter
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('http://localhost:3000/login');
  });
});

// Route pour supprimer les utilisateurs avec githubId null
router.delete('/delete-null-github', async (req, res) => {
  try {
    const result = await User.deleteMany({ githubId: null });
    res.json({ message: `✅ ${result.deletedCount} utilisateurs supprimés.` });
  } catch (err) {
    res.status(500).json({ error: '❌ Erreur lors de la suppression.' });
  }
});

module.exports = router;