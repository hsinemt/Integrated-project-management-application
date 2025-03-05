const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Groupe = require('../models/Group');

// Add a new project
router.post('/add', async (req, res) => {
    try {
        const { title, description, group } = req.body;

        // Check if group exists
        const existingGroup = await Groupe.findById(group);
        if (!existingGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Create new project
        const newProject = new Project({
            title,
            description,
            group,
        });

        // Save project to database
        const savedProject = await newProject.save();

        // Add project to the group's id_projects array
        existingGroup.id_projects.push(savedProject._id);
        await existingGroup.save();

        res.status(201).json(savedProject);
    } catch (error) {
        res.status(500).json({ message: 'Error adding project', error: error.message });
    }
});

module.exports = router;
