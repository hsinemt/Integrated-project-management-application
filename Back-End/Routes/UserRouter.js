const express = require('express');
const {
    signup,
    sendVerifyOtp1,
    sendVerifyOtp,
    verifyEmail,
    login,
    addManager,
    addTutor,
    addStudent,
    getAllUsers,
    updateStudentSkills,
    getProfile,
    logout,
    getStudentProfile,
    isUserEmailAvailable,
    loginWithFace,
    updateUser,
    deleteUser
} = require('../Controllers/UserController');

const User = require("../Models/User");
const { authMiddleware, isAdmin} = require('../Middlewares/UserValidation');
const {signupValidation, userToken} = require('../Middlewares/UserValidation');
const {
    sendResetPasswordOTP,
    resetPassword
} = require('../Controllers/forgotPasswordController');
const multer = require("multer");
const path = require("path");
const fs = require('fs');

// Configure multer for file uploads with improved error handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            // Make sure the uploads directory exists
            const dir = path.join(__dirname, '..', 'uploads');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            cb(new Error(`Failed to create upload directory: ${error.message}`));
        }
    },
    filename: (req, file, cb) => {
        try {
            // Generate a safer filename with timestamp and preserved extension
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileExtension = path.extname(file.originalname) || '.jpg';
            cb(null, 'user-' + uniqueSuffix + fileExtension);
        } catch (error) {
            console.error('Error generating filename:', error);
            cb(new Error(`Failed to generate filename: ${error.message}`));
        }
    },
});

// Add file filter for images with improved error handling
const fileFilter = (req, file, cb) => {
    try {
        // Accept only image files
        if (!file.mimetype) {
            cb(new Error('File missing mimetype'), false);
            return;
        }

        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`Only image files are allowed! Received ${file.mimetype}`), false);
        }
    } catch (error) {
        console.error('File filter error:', error);
        cb(new Error(`File filter error: ${error.message}`), false);
    }
};

// Configure multer with error handling and reasonable limits
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB (reduced from 4MB)
        files: 1 // Only allow 1 file
    }
});

// Helper function to handle multer upload with proper error handling
const handleFileUpload = (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('File upload error:', err);

            if (err instanceof multer.MulterError) {
                // A Multer error occurred
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File is too large. Maximum size is 2MB'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`
                });
            } else {
                // An unknown error occurred
                return res.status(500).json({
                    success: false,
                    message: `Server error during upload: ${err.message}`
                });
            }
        }

        // No file uploaded check - uncomment if you want to enforce photo requirement
        // if (!req.file) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'No photo uploaded'
        //     });
        // }

        if (req.file) {
            // Process the uploaded file
            console.log('Photo uploaded successfully:', req.file.filename);

            // Set the avatar path
            req.body.avatar = `/uploads/${req.file.filename}`;
        }

        next();
    });
};

// Create router
const router = express.Router();

// Authentication routes
router.post('/signup', signupValidation, signup);
router.post('/login', login);
router.post('/loginWithFace', loginWithFace);
router.post('/logout', logout);

// Signup with photo handling
router.post('/signupWithPhoto', (req, res, next) => {
    handleFileUpload(req, res, () => {
        // Set the role to student for signup
        req.body.role = 'student';

        // Call the signup controller
        signup(req, res);
    });
});

// Email verification routes
router.post('/sendVerifyOtp', userToken, sendVerifyOtp);
router.post('/verifyAccount', userToken, verifyEmail);
router.post('/send-2fa-otp1', sendVerifyOtp1);

// User management routes
router.post('/addManager', userToken, addManager);
router.post('/addTutor', userToken, addTutor);
router.post('/addStudent', userToken, addStudent);

// Add manager with photo
router.post('/addManagerWithPhoto', userToken, (req, res, next) => {
    handleFileUpload(req, res, () => {
        addManager(req, res);
    });
});

// Add tutor with photo
router.post('/addTutorWithPhoto', userToken, (req, res, next) => {
    handleFileUpload(req, res, () => {
        addTutor(req, res);
    });
});

// Add student with photo
router.post('/addStudentWithPhoto', userToken, (req, res, next) => {
    handleFileUpload(req, res, () => {
        // Parse skills if they're sent as a string
        if (req.body.skills && typeof req.body.skills === 'string') {
            try {
                req.body.skills = JSON.parse(req.body.skills);
            } catch (e) {
                console.error('Error parsing skills:', e);
                req.body.skills = [];
            }
        }

        addStudent(req, res);
    });
});

// User retrieval and update routes
router.get('/getUsers', getAllUsers);
router.put('/update-skills', userToken, updateStudentSkills);
router.get('/profile', authMiddleware, getProfile);
router.get('/profilegroupe', authMiddleware, getStudentProfile);
router.get('/check-email', isUserEmailAvailable);

// Password reset routes
router.post('/reset-password', sendResetPasswordOTP);
router.post('/reset/:token', resetPassword);

// Admin routes for user management
router.put('/update/:id', userToken, isAdmin, updateUser);
router.delete('/delete/:id', userToken, isAdmin, deleteUser);

// Update with photo
router.put('/update-with-photo/:id', userToken, isAdmin, (req, res, next) => {
    handleFileUpload(req, res, () => {
        // If a file was uploaded and we have a userId
        if (req.file && req.params.id) {
            const userId = req.params.id;

            // Get the current user to find and remove old avatar if exists
            User.findById(userId)
                .then(currentUser => {
                    if (currentUser && currentUser.avatar && currentUser.avatar.startsWith('/uploads/')) {
                        const oldAvatarPath = path.join(__dirname, '..', currentUser.avatar);
                        if (fs.existsSync(oldAvatarPath)) {
                            fs.unlinkSync(oldAvatarPath);
                            console.log('Removed old avatar file');
                        }
                    }

                    // Continue with the update
                    updateUser(req, res);
                })
                .catch(error => {
                    console.error('Error finding user for avatar update:', error);
                    // Continue with update even if we can't remove old avatar
                    updateUser(req, res);
                });
        } else {
            // No file uploaded or no ID, just continue with update
            updateUser(req, res);
        }
    });
});

// Error handler middleware
router.use((err, req, res, next) => {
    console.error('Router error:', err);

    // If we have an uploaded file but encountered an error, clean it up
    if (req.file && req.file.path) {
        try {
            fs.unlinkSync(req.file.path);
            console.log('Cleaned up file after error');
        } catch (unlinkError) {
            console.error('Failed to clean up file:', unlinkError);
        }
    }

    res.status(500).json({
        success: false,
        message: err.message || 'An unexpected error occurred'
    });
});

module.exports = router;