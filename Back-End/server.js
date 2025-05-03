const express = require('express');
const http = require('http'); // Ajout pour Socket.IO
const socketIo = require('socket.io'); // Ajout pour Socket.IO
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const mongoose = require('mongoose'); // Ajout explicite

const UserRouter = require('./Routes/UserRouter');
const UploadRouter = require('./Routes/UploadRouter');
const projectRouter = require('./Routes/ProjectRouter');
const taskRouter = require('./Routes/taskRoutes');
const groupRouter = require('./Routes/groupRoutes');
const authRoutes = require('./Routes/authRoutes');
const choixRoutes = require('./Routes/choixRoutes');
const tutorRoutes = require('./Routes/tutorRoutes');

const nlpController = require('./Controllers/nlpController');
const AiProjectGenController = require('./Controllers/AiProjectGenController');

const { handleMulterError } = require('./Config/ProjectUploadConfig');
const { aiGenerationLimiter } = require('./Middlewares/rateLimitMiddleware');

require('dotenv').config();
require('./Config/db');

require('./Models/User');
require('./Models/Student');
require('./Models/Tutor');
require('./Models/Manager');
require('./Models/Group');
require('./Models/Project');
require('./Models/tasks');
require('./Models/CodeMark');
require('./Models/Message'); // Ajout du modèle Message

require('./config/passportConfig');
require('./config/passportGoogle');

const app = express();
const server = http.createServer(app); // Créer un serveur HTTP pour Socket.IO
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
}); // Initialiser Socket.IO

const PORT = parseInt(process.env.PORT || '9777');

// Socket.IO : Gestion des connexions et des messages
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);

  // Rejoindre un groupe
  socket.on('joinGroup', async ({ groupId, userId }) => {
    try {
      const Group = mongoose.model('Groupes');
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit('error', { message: 'Groupe non trouvé' });
        return;
      }
      // Vérifier si l'utilisateur est un étudiant ou le tuteur du groupe
      if (
        group.id_students.includes(userId) ||
        group.id_tutor.toString() === userId
      ) {
        socket.join(groupId);
        console.log(`Utilisateur ${userId} a rejoint le groupe ${groupId}`);
      } else {
        socket.emit('error', { message: 'Accès non autorisé au groupe' });
      }
    } catch (error) {
      console.error('Erreur lors de la jointure du groupe:', error);
      socket.emit('error', { message: 'Erreur serveur' });
    }
  });

  // Envoyer un message
  socket.on('sendMessage', async ({ groupId, userId, content }) => {
    try {
      const Group = mongoose.model('Groupes');
      const Message = mongoose.model('Message');
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit('error', { message: 'Groupe non trouvé' });
        return;
      }
      // Vérifier si l'utilisateur est autorisé
      if (
        group.id_students.includes(userId) ||
        group.id_tutor.toString() === userId
      ) {
        const message = new Message({
          group: groupId,
          sender: userId,
          content
        });
        await message.save();
        // Émettre le message à tous les membres du groupe
        io.to(groupId).emit('receiveMessage', {
          _id: message._id,
          group: groupId,
          sender: userId,
          content,
          timestamp: message.timestamp
        });
      } else {
        socket.emit('error', { message: 'Accès non autorisé' });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      socket.emit('error', { message: 'Erreur serveur' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
  });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware setup
app.use('/uploads', express.static(uploadsDir));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    }
  }
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Base route
app.get('/', (req, res) => {
  res.send('server is working');
});

// Route handlers
app.use('/user', UserRouter);
app.use('/upload', UploadRouter);
app.use('/project', projectRouter);
app.use('/project', taskRouter);
app.use('/group', groupRouter);
app.use('/auth', authRoutes);
app.use('/api/tasks', taskRouter);
app.use('/choix', choixRoutes);
app.use('/tutor', tutorRoutes);
app.use('/messages', require('./Routes/messageRoutes')); // Nouvelle route pour les messages

app.use('/nlp', nlpController);
app.use('/nlp', (req, res, next) => {
  console.log(`AI route accessed: ${req.method} ${req.originalUrl}`);
  console.log('Request body:', req.body);
  next();
}, aiGenerationLimiter, AiProjectGenController);

// Error handling
app.use(handleMulterError);
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please:
    1. Stop the other process using this port, or
    2. Use a different port by setting the PORT environment variable.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});