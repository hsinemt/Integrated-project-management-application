const express = require('express');
const { signup,sendVerifyOtp1,sendVerifyOtp ,verifyEmail, login, addManager, addTutor,addStudent, getAllUsers, updateStudentSkills,getProfile,logout,getStudentProfile} = require('../Controllers/UserController');
// const ProjectController = require('../Controllers/ProjectController');
// const { validateKeywords } = require('../Middlewares/ProjectValidation');
const { authMiddleware} = require('../Middlewares/UserValidation');
const {signupValidation,userToken} = require('../Middlewares/UserValidation')
const {
    sendResetPasswordOTP,
    resetPassword
} = require('../Controllers/forgotPasswordController');

const router = express.Router();
const User = require("../Models/User");
router.post('/signup', signupValidation, signup);
router.post('/login',login);
router.post('/sendVerifyOtp',userToken,sendVerifyOtp);
router.post('/verifyAccount',userToken,verifyEmail);
router.post('/addManager', userToken, addManager);
router.post('/addTutor', userToken, addTutor);
router.post('/addStudent', userToken, addStudent);
router.get('/getUsers', getAllUsers);
router.put("/update-skills", userToken, updateStudentSkills);
router.get("/profile", authMiddleware, getProfile);
router.post('/reset-password', sendResetPasswordOTP);
router.post('/reset/:token', resetPassword);
router.post("/logout", logout);
router.post("/send-2fa-otp1", sendVerifyOtp1);
const bcrypt = require('bcrypt');
const multer = require("multer");
const path = require("path");
const mongoose = require('mongoose');
// OR
router.get('/profilegroupe', authMiddleware, getStudentProfile);
// OR// For ES Modules
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });
// router.post('/generate', validateKeywords, ProjectController.generateITSubject.bind(ProjectController));
// router.post('/generate-and-create', validateKeywords, ProjectController.createProjectFromGenerated.bind(ProjectController));
router.post("/upload", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        console.log("Image URL:", imageUrl);
        console.log("Authenticated User ID:", req.user.id);

        // First verify the user exists
        const userExists = await User.findById(req.user.id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update with explicit $set and proper error handling
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { images: imageUrl } },
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password'); // Exclude sensitive data

        console.log("Updated user document:", updatedUser);

        if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
        }

        return res.json({
            success: true,
            message: "Image uploaded and user updated successfully",
            imageUrl,
            user: updatedUser
        });

    } catch (error) {
        console.error("Full upload error:", error);
        return res.status(500).json({
            message: "Error in image upload process",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.get("/dashboard/:role", authMiddleware, (req, res) => {
    const allowedRoles = ["admin", "manager", "tutor", "student"];
    if (!allowedRoles.includes(req.params.role) || req.params.role !== req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json({ message: `Welcome ${req.params.role}` });
  });

  router.put('/update-profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, lastname, birthday, password } = req.body;
  
      // Hash the password if it's provided
      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
  
      // Find the user and update their profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, lastname, birthday, password: hashedPassword },
        { new: true } // Return the updated user
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
module.exports = router;