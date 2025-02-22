const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URL || 'mongodb://localhost:27017/user';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connexion à MongoDB réussie'))
  .catch(err => console.error('❌ Erreur de connexion à MongoDB:', err));
