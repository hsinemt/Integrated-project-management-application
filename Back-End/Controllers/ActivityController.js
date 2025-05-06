const mongoose = require('mongoose');
const Activity = require('../Models/Activity');
const Task = require('../Models/tasks');
const User = require('../Models/User');

/**
 * Create a new activity record
 * @param {Object} activityData - Activity data including taskId, userId, actionType, etc.
 * @returns {Promise<Object>} Created activity
 */
const createActivity = async (activityData) => {
    try {
        const newActivity = new Activity(activityData);
        return await newActivity.save();
    } catch (error) {
        console.error('Error creating activity:', error);
        throw error;
    }
};

/**
 * Get all activities for a specific task
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
exports.getTaskActivities = async (req, res) => {
    const { taskId } = req.params;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    try {
        // Check if task exists
        const taskExists = await Task.exists({ _id: taskId });
        if (!taskExists) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Find all activities for the task, sorted by timestamp (newest first)
        const activities = await Activity.find({ taskId })
            .sort({ timestamp: -1 })
            .populate('userId', 'name lastname avatar') // Populate user details
            .populate('fileId', 'fileName language'); // Populate file details if available

        res.status(200).json({
            success: true,
            activities
        });
    } catch (error) {
        console.error("Error fetching task activities:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching activities"
        });
    }
};

/**
 * Get all activities for a specific user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
exports.getUserActivities = async (req, res) => {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    try {
        // Check if user exists
        const userExists = await User.exists({ _id: userId });
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find all activities for the user, sorted by timestamp (newest first)
        const activities = await Activity.find({ userId })
            .sort({ timestamp: -1 })
            .populate('taskId', 'name description') // Populate task details
            .populate('fileId', 'fileName language'); // Populate file details if available

        res.status(200).json({
            success: true,
            activities
        });
    } catch (error) {
        console.error("Error fetching user activities:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching activities"
        });
    }
};

/**
 * Create a new activity record (exposed as API endpoint)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
exports.createActivityEndpoint = async (req, res) => {
    const { taskId, userId, actionType, fileId, fileName, fileLanguage } = req.body;

    // Validate required fields
    if (!taskId || !userId || !actionType || !fileName || !fileLanguage) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    // Validate taskId and userId
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID or user ID"
        });
    }

    // Validate actionType
    if (!['create', 'update', 'delete'].includes(actionType)) {
        return res.status(400).json({
            success: false,
            message: "Invalid action type"
        });
    }

    try {
        // Check if task and user exist
        const [taskExists, userExists] = await Promise.all([
            Task.exists({ _id: taskId }),
            User.exists({ _id: userId })
        ]);

        if (!taskExists) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Create activity
        const activityData = {
            taskId,
            userId,
            actionType,
            fileId,
            fileName,
            fileLanguage,
            timestamp: new Date()
        };

        const newActivity = await createActivity(activityData);

        res.status(201).json({
            success: true,
            activity: newActivity
        });
    } catch (error) {
        console.error("Error creating activity:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating activity"
        });
    }
};

// Export the createActivity function for use in other controllers
exports.createActivity = createActivity;