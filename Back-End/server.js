const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');
const cookieParser = require('cookie-parser');
const projectRouter = require('./Routes/ProjectRouter');
const path = require('path');
const { handleMulterError } = require('./Config/ProjectUploadConfig');


const AiProjectGenController = require('./Controllers/AiProjectGenController');
const nlpController = require('./Controllers/nlpController');
const { aiGenerationLimiter } = require('./Middlewares/rateLimitMiddleware');

require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 9777;


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Body parsers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.get('/', (req, res) => {
    res.send('server is working');
});


app.use('/user', UserRouter);
app.use('/project', projectRouter);


app.use('/nlp', (req, res, next) => {
    console.log(`AI route accessed: ${req.method} ${req.originalUrl}`);
    console.log('Request body:', req.body);
    next();
}, aiGenerationLimiter, AiProjectGenController);


app.use('/nlp', nlpController);

app.use(handleMulterError);
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    //console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});