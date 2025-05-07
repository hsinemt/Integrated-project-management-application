exports.githubCallback = (req, res) => {
    res.redirect('/dashboard');
  };
  
  exports.logout = (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  };
  const User = require('../Models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};