const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./Routes/authRoutes');
require('dotenv').config();

require('./Config/db'); // Connexion à MongoDB
require('./Config/passportConfig'); // Configuration de Passport.js
require('./Config/passportGoogle');
const app = express();
app.use(express.json());
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');

// Configuration de session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
const PORT = process.env.PORT || 5000;

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(cors());
app.use('/auth', UserRouter);
app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});

