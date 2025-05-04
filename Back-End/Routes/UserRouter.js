const express = require('express');
const { updateSdent,signup,sendVerifyOtp1,sendVerifyOtp ,verifyEmail, login, addManager, addTutor,addStudent, getAllUsers, updateStudentSkills,getProfile,logout,getStudentProfile, isUserEmailAvailable, updateUser, deleteUser} = require('../Controllers/UserController');
// const ProjectController = require('../Controllers/ProjectController');
// const { validateKeywords } = require('../Middlewares/ProjectValidation');
const User = require("../Models/User");
const { authMiddleware, isAdmin} = require('../Middlewares/UserValidation');
const {signupValidation,userToken} = require('../Middlewares/UserValidation')
const {
    sendResetPasswordOTP,
    resetPassword
} = require('../Controllers/forgotPasswordController');
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Add file filter for images
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024
    }
});

const router = express.Router();
router.post('/signup', signupValidation, signup);
router.post('/login',login);
router.post('/sendVerifyOtp',userToken,sendVerifyOtp);
router.post('/verifyAccount',userToken,verifyEmail);
router.post('/addManager', userToken, addManager);
router.post('/addTutor', userToken, addTutor);
router.post('/addStudent', userToken, addStudent);

// Add manager with photo
router.post('/addManagerWithPhoto', userToken, upload.single('photo'), async (req, res) => {
    try {

        if (req.file) {
            req.body.avatar = `/uploads/${req.file.filename}`;
        }


        await addManager(req, res);
    } catch (error) {
        console.error('Error adding manager with photo:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


router.post('/addTutorWithPhoto', userToken, upload.single('photo'), async (req, res) => {
    try {

        if (req.file) {
            req.body.avatar = `/uploads/${req.file.filename}`;
        }

        await addTutor(req, res);
    } catch (error) {
        console.error('Error adding tutor with photo:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


router.post('/addStudentWithPhoto', userToken, upload.single('photo'), async (req, res) => {
    try {

        if (req.file) {
            req.body.avatar = `/uploads/${req.file.filename}`;
        }


        if (req.body.skills && typeof req.body.skills === 'string') {
            try {
                req.body.skills = JSON.parse(req.body.skills);
            } catch (e) {
                console.error('Error parsing skills:', e);

                req.body.skills = [];
            }
        }


        await addStudent(req, res);
    } catch (error) {
        console.error('Error adding student with photo:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
router.get('/getUsers', getAllUsers);
router.put("/update-skills", userToken, updateStudentSkills);
router.get("/profile", authMiddleware, getProfile);
router.post('/reset-password', sendResetPasswordOTP);
router.post('/reset/:token', resetPassword);
router.post("/logout", logout);
router.post("/send-2fa-otp1", sendVerifyOtp1);
router.get('/check-email', isUserEmailAvailable);
router.put('/update/:id', userToken, isAdmin, updateUser);
router.delete('/delete/:id', userToken, isAdmin, deleteUser);
router.get('/profilegroupe', authMiddleware, getStudentProfile);
router.post("/upload", authMiddleware, upload.single("image"),updateSdent);
router.put('/update-with-photo/:id', userToken, isAdmin, upload.single('photo'), async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;


        if (req.file) {
            const photoUrl = `/uploads/${req.file.filename}`;
            updates.avatar = photoUrl;
        }


        await updateUser(req, res);
    } catch (error) {
        console.error('Error updating user with photo:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
const bcrypt = require('bcrypt');
// OR
router.put('/update-profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, lastname, birthday, password } = req.body;

      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;


      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, lastname, birthday, password: hashedPassword },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        updatedUser,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Error updating profile', error });
    }
});
// OR// For ES Modules
// router.post('/generate', validateKeywords, ProjectController.generateITSubject.bind(ProjectController));
// router.post('/generate-and-create', validateKeywords, ProjectController.createProjectFromGenerated.bind(ProjectController));
// General image upload endpoint moved to UploadRouter.js


module.exports = router;
