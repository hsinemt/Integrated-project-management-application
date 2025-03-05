const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const UserRouter = require('./Routes/UserRouter');
const taskRoutes = require('./Routes/taskRoutes');
require('dotenv').config();
require('./Config/db');

const projectRoutes = require('./Routes/projectRoutes');
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(cors()); // Enable CORS

// Routes
app.use('/user', UserRouter); // User routes


app.use('/projects', taskRoutes);


// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Default route
app.get('/', (req, res) => {
    res.send('Server is working');
});

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});
app.use('/projects', projectRoutes);
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});