const express = require('express');
const multer = require("multer");
const path = require("path");
const bcrypt = require('bcrypt');
const User = require("../Models/User");
const { authMiddleware, isAdmin } = require('../Middlewares/UserValidation');

const router = express.Router();


const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
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

router.post("/upload", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        // console.log("Image URL:", imageUrl);
        // console.log("Authenticated User ID:", req.user.id);

        const userExists = await User.findById(req.user.id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { avatar: imageUrl } },
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password');

        //console.log("Updated user document:", updatedUser);

        if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
        }

        return res.json({
            success: true,
            message: "Image uploaded and user avatar updated successfully",
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


router.post("/upload-photo", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        //console.log("Profile photo URL:", imageUrl);

        let userId = req.user.id;


        if (req.body.userId && req.user.role === 'admin') {
            userId = req.body.userId;
        }

        console.log("Updating user ID:", userId);

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { avatar: imageUrl } },
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password');

        if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
        }

        return res.json({
            success: true,
            message: "Profile photo uploaded successfully",
            imageUrl,
            user: updatedUser
        });

    } catch (error) {
        console.error("Profile photo upload error:", error);
        return res.status(500).json({
            message: "Error uploading profile photo",
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

module.exports = router;
