const express = require('express');
const router = express.Router();
const aiService = require('../Services/AiGenService');
const { userToken } = require('../Middlewares/UserValidation');
const UserModel = require('../Models/User');
const Project = require('../Models/Project');

/**
 * @route   POST /nlp/generate-from-prompt
 * @desc    Generate project details from a prompt
 * @access  Private
 */
router.post('/generate-from-prompt', userToken, async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }


        const projectDetails = await aiService.generateProjectFromPrompt(prompt);

        res.status(200).json({
            success: true,
            message: 'Project details generated successfully',
            projectDetails
        });
    } catch (error) {
        console.error("Error in generate-from-prompt:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate project details',
            error: error.message
        });
    }
});

/**
 * @route   POST /nlp/create-project-from-prompt
 * @desc    Generate and save a project from a prompt
 * @access  Private
 */
router.post('/create-project-from-prompt', userToken, async (req, res) => {
    try {
        const { prompt, speciality, difficulty } = req.body;
        const userId = req.body.userId;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }


        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        const projectDetails = await aiService.generateProjectFromPrompt(prompt);


        const creatorInfo = {
            userId: user._id,
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            avatar: user.avatar || ''
        };

        const newProject = new Project({
            title: projectDetails.title,
            description: projectDetails.description,
            keywords: projectDetails.keywords || [],
            difficulty: difficulty || 'Medium',
            status: 'Not Started',
            speciality: speciality || undefined,
            creator: creatorInfo,
            createdAt: new Date(),
            updatedAt: new Date()
        });


        const savedProject = await newProject.save();

        res.status(201).json({
            success: true,
            message: 'Project generated and saved successfully',
            project: savedProject
        });
    } catch (error) {
        console.error("Error in create-project-from-prompt:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate and save project',
            error: error.message
        });
    }
});


module.exports = router;