const express = require('express');
const router = express.Router();
const Task = require('../Models/task');
const mongoose = require('mongoose');
const GroupeModel = require('../Models/Group');
const { authMiddleware } = require("../Middlewares/UserValidation");
const User = require("../Models/user");
const Project = require('../Models/Project'); // ✅ Capital P

router.get('/groups-progress', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('groups name role classe')
            .lean();

        if (!user || user.role !== 'tutor') {
            return res.status(404).json({ message: "Tutor not found" });
        }

        if (!user.groups || !Array.isArray(user.groups) || user.groups.length === 0) {
            return res.json({
                tutor: {
                    _id: user._id,
                    name: user.name,
                    classe: user.classe
                },
                groups: []
            });
        }

        const groupIds = user.groups.map(id =>
            typeof id === 'string' ? mongoose.Types.ObjectId(id) : id
        );

        const groups = await GroupeModel.find({ _id: { $in: groupIds } });
        
        // Add this debug log:
        console.log("Raw groups data:", JSON.stringify(groups, null, 2));

        const groupsWithProgress = await Promise.all(
            groups.map(async (group) => {
                try {
                    // Debug: log the group's id_project
                    console.log(`Group ${group.nom_groupe} (${group._id}) has id_project:`, group.id_project);
                    
                    const project = group.id_project
                        ? await Project.findById(group.id_project).lean()
                        : null;
                    
                    // Debug: log the found project
                    console.log(`Found project for group ${group.nom_groupe}:`, project);

                    const tasks = await Task.find({
                        group: group._id,
                        project: project ? project._id : null
                    }).lean();

                    const totalTasks = tasks.length;
                    const completedTasks = tasks.filter(t => t.état === 'Completed').length;
                    const progress = totalTasks > 0
                        ? Math.round((completedTasks / totalTasks) * 100)
                        : 0;

                    return {
                        _id: group._id,
                        nom_groupe: group.nom_groupe,
                        project,
                        totalTasks,
                        completedTasks,
                        progress,
                    };
                } catch (err) {
                    console.error("Error loading group data:", err);
                    return {
                        _id: group._id,
                        nom_groupe: group.nom_groupe,
                        error: "Error calculating progress"
                    };
                }
            })
        );

        res.json({
            tutor: {
                _id: user._id,
                name: user.name,
                classe: user.classe
            },
            groups: groupsWithProgress,
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});
module.exports = router;
