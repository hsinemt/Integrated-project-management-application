const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');


const UserRouter = require('./Routes/UserRouter');
const UploadRouter = require('./Routes/UploadRouter');
const projectRouter = require('./Routes/ProjectRouter');
const taskRouter = require('./Routes/taskRoutes');
const groupRouter = require('./Routes/groupRoutes');
const authRoutes = require('./Routes/authRoutes');
const choixRoutes = require('./Routes/choixRoutes');
const tutorRoutes = require('./Routes/tutorRoutes');
const codeReviewRouter = require('./Routes/codeReviewRoutes');

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

// Passport configuration
require('./config/passportConfig');
require('./config/passportGoogle');

const PORT = parseInt(process.env.PORT || '9777');
// Middleware setup
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
    credentials: true,
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
    secret: process.env.SESSION_SECRET || 'your-secret-key',
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
app.use('/api/code-review', codeReviewRouter);

// AI and NLP routes
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
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
