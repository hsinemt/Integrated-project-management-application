const express = require("express");
const { authMiddleware } = require("../Middlewares/UserValidation");
const { login, getProfile,getStudentProfile } = require("../Controllers/userControllers");
const User = require("../Models/user");
const multer = require("multer");
const path = require("path");
const StudentModel= require("../Models/student");
const router = express.Router();

// Set up multer storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});

const upload = multer({ storage });

// Get user profile
router.get("/profile", authMiddleware, getProfile);




router.get('/profilegroupe', authMiddleware, getStudentProfile);
// User login
router.post("/login", login);

// Upload profile image
router.post("/upload", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log("Image URL sent to frontend:", imageUrl);  // Log the image URL here

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, // Authenticated user's ID
      { images: imageUrl },
      { new: true }
    );

    res.json({ success: true, message: "Image uploaded successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error uploading image", error });
  }
});


// Role-based dashboard access
router.get("/dashboard/:role", authMiddleware, (req, res) => {
  const allowedRoles = ["admin", "manager", "tutor", "student"];
  if (!allowedRoles.includes(req.params.role) || req.params.role !== req.user.role) {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: `Welcome ${req.params.role}` });
});
router.post('/update-skills', async (req, res) => {
  try {
    console.log('POST /user/update-skills HIT');
    console.log('Body:', req.body);

    const { userId, skills } = req.body;

    const updatedStudent = await StudentModel.findByIdAndUpdate(
      userId,
      { skills },
      { new: true }
    );

    console.log('Updated student:', updatedStudent); // 👈 Add this

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Skills updated successfully',
      updatedSkills: updatedStudent.skills,
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({ message: 'Error updating skills', error });
  }
});



const bcrypt = require('bcrypt');

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
