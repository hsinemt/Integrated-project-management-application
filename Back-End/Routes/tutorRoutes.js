const express = require('express');
const router = express.Router();
const TaskModel = require('../Models/tasks');
const mongoose = require('mongoose');
const GroupeModel = require('../Models/Group');
const { authMiddleware } = require("../Middlewares/UserValidation");
const User = require("../Models/User");

router.get('/groups-progress', authMiddleware, async (req, res) => {
    try {
        // 1. Verify tutor and get basic info
        const tutor = await User.findById(req.user.id);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(403).json({ message: "Access denied - tutor only" });
        }

        // 2. Find all groups for this tutor with project names
        const groups = await GroupeModel.find({ id_tutor: tutor._id })
            .populate({
                path: 'id_project',
                select: 'title',
            
            })
            .lean();

        // 3. Format response with progress data
        const response = {
            tutorId: tutor._id.toString(),
            groups: await Promise.all(groups.map(async (group) => {
                // Get ALL tasks for this group (no project filtering)
                const tasks = await TaskModel.find({ group: group._id }).lean(); // Ensure 'group' matches the schema field name
                console.log("Tasks for group:", group._id.toString(), tasks);
                        
                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(t => t.état === 'Completed').length;
                const progress = totalTasks > 0 
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0;

                return {
                    _id: group._id.toString(),
                    name: group.nom_groupe,
                    projectId: group.id_project?._id?.toString() || null,
                    projectName: group.id_project?.title || null,
                    studentCount: group.id_students?.length || 0,
                    progress,
                    completedTasks,
                    totalTasks
                };
            }))
        };

        res.json(response);

    } catch (error) {
        console.error("Error in /groups-progress:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});
module.exports = router;
