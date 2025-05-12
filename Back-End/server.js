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
const codeFileRoutes = require('./Routes/codeFileRoutes');
const activityRoutes = require('./Routes/activityRoutes');
const codeReviewRouter = require('./Routes/codeReviewRoutes');
const finalGradeRoutes = require('./Routes/finalGradeRoutes');


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
require('./Models/Activity');

// Passport configuration
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
}


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
//const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware setup
// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir));
app.post('/test-upload', (req, res) => {
    const upload = multer({ dest: 'uploads/' }).single('file');

    upload(req, res, function(err) {
        try {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ error: err.message });
            }

            console.log('File received:', req.file);
            return res.status(200).json({
                success: true,
                message: 'File received successfully',
                file: req.file ? req.file.filename : 'No file'
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});

app.get('/diagnostic/scores', async (req, res) => {
    try {
        const CodeMark = require('./Models/CodeMark');

        // Get the 10 most recent submissions
        const recentScores = await CodeMark.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .select('submissionId score fileType fileLanguage analysisSource status');

        // Calculate score distribution
        const allScores = await CodeMark.find({}).select('score');
        const scoreDistribution = {};

        allScores.forEach(item => {
            const score = item.score;
            scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
        });

        // Sort by score
        const sortedDistribution = Object.entries(scoreDistribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});

        res.json({
            success: true,
            recentSubmissions: recentScores,
            totalSubmissions: allScores.length,
            scoreDistribution: sortedDistribution,
            message: "This is a diagnostic endpoint to check score distribution"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching diagnostic data",
            error: error.message
        });
    }
});

// Configure body parser
app.use(bodyParser.json({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
//app.use('/uploads', express.static(uploadsDir));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  credentials: true,
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization','X-Upload-Field']
}));
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}, express.static(path.join(__dirname, 'uploads')));


// Security with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    }
  }
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
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
app.use('/api', codeFileRoutes);
app.use('/api', activityRoutes);
app.use('/api/code-review', codeReviewRouter);
app.use('/grades', finalGradeRoutes);
// AI and NLP routes
app.use('/nlp', nlpController);
app.use('/nlp', (req, res, next) => {
    //console.log(`AI route accessed: ${req.method} ${req.originalUrl}`);
    //console.log('Request body:', req.body);
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

app.use(function(req, res, next) {
    res.setTimeout(300000); // 5 minutes
    next();
});

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

// Then modify your server creation to include timeout:
// const server = app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// }).on('error', (err) => {
//     if (err.code === 'EADDRINUSE') {
//         console.error(`Port ${PORT} is already in use. Please:
//     1. Stop the other process using this port, or
//     2. Use a different port by setting the PORT environment variable.`);
//         process.exit(1);
//     } else {
//         console.error('Server error:', err);
//         process.exit(1);
//     }
// });

// Set server timeout
server.timeout = 300000; // 5 minutes

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
