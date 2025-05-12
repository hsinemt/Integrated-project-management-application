const mongoose = require('mongoose');
const CodeFile = require('../Models/CodeFile');
const Task = require('../Models/tasks');
const { createActivity } = require('./ActivityController');


exports.getAllCodeFiles = async (req, res) => {
    const { taskId } = req.params;


    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }

    try {

        const codeFiles = await CodeFile.find({ taskId });

        res.status(200).json({
            success: true,
            codeFiles
        });
    } catch (error) {
        console.error("Error fetching code files:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching code files"
        });
    }
};


exports.getCodeFileById = async (req, res) => {
    const { fileId } = req.params;

    // Validate fileId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid file ID"
        });
    }

    try {

        const codeFile = await CodeFile.findById(fileId);

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: "Code file not found"
            });
        }

        res.status(200).json({
            success: true,
            codeFile
        });
    } catch (error) {
        console.error("Error fetching code file:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching code file"
        });
    }
};


exports.createCodeFile = async (req, res) => {
    const { taskId } = req.params;
    const { code, language, fileName } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }


    if (code === undefined || code === null || code === '' || !language || !fileName) {
        return res.status(400).json({
            success: false,
            message: "Code, language, and fileName are required"
        });
    }

    try {

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }


        const existingFile = await CodeFile.findOne({ taskId, fileName });
        if (existingFile) {
            return res.status(400).json({
                success: false,
                message: "A file with this name already exists for this task"
            });
        }


        const newCodeFile = new CodeFile({
            code,
            language,
            fileName,
            taskId
        });


        const savedCodeFile = await newCodeFile.save();

        // Add the code file reference to the task
        task.codeFiles.push(savedCodeFile._id);
        await task.save();

        // Populate the task with its code files
        const updatedTask = await Task.findById(taskId).populate('codeFiles');

        // Create activity record for file creation
        try {
            // Get user ID from request (assuming authentication middleware sets req.user)
            const userId = req.user ? req.user._id : (req.body.userId || task.assignedTo);

            await createActivity({
                taskId,
                userId,
                actionType: 'create',
                fileId: savedCodeFile._id,
                fileName: savedCodeFile.fileName,
                fileLanguage: savedCodeFile.language
            });

            console.log('Activity recorded for file creation');
        } catch (activityError) {
            // Log error but don't fail the request
            console.error('Error recording activity:', activityError);
        }

        res.status(201).json({
            success: true,
            codeFile: savedCodeFile,
            task: updatedTask
        });
    } catch (error) {
        console.error("Error creating code file:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating code file"
        });
    }
};


exports.updateCodeFile = async (req, res) => {
    const { fileId } = req.params;
    const { code, language } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid file ID"
        });
    }

    if (!code && !language) {
        return res.status(400).json({
            success: false,
            message: "At least one field (code or language) must be provided"
        });
    }

    try {

        const codeFile = await CodeFile.findById(fileId);

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: "Code file not found"
            });
        }

        if (code !== undefined) codeFile.code = code;
        if (language !== undefined) codeFile.language = language;

        const updatedCodeFile = await codeFile.save();

        const task = await Task.findById(codeFile.taskId).populate('codeFiles');

        try {
            const userId = req.user ? req.user._id : (req.body.userId || task.assignedTo);

            await createActivity({
                taskId: codeFile.taskId,
                userId,
                actionType: 'update',
                fileId: updatedCodeFile._id,
                fileName: updatedCodeFile.fileName,
                fileLanguage: updatedCodeFile.language
            });


        } catch (activityError) {
            console.error('Error recording activity:', activityError);
        }

        res.status(200).json({
            success: true,
            codeFile: updatedCodeFile,
            task
        });
    } catch (error) {
        console.error("Error updating code file:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating code file"
        });
    }
};

exports.deleteCodeFile = async (req, res) => {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid file ID"
        });
    }

    try {
        const codeFile = await CodeFile.findById(fileId);

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: "Code file not found"
            });
        }

        const taskId = codeFile.taskId;


        await CodeFile.findByIdAndDelete(fileId);

        await Task.findByIdAndUpdate(
            taskId,
            { $pull: { codeFiles: fileId } }
        );

        const updatedTask = await Task.findById(taskId).populate('codeFiles');


        try {

            const userId = req.user ? req.user._id : (req.body.userId || updatedTask.assignedTo);

            // Store file details before deletion for the activity record
            const fileName = codeFile.fileName;
            const fileLanguage = codeFile.language;

            await createActivity({
                taskId,
                userId,
                actionType: 'delete',

                fileName,
                fileLanguage
            });


        } catch (activityError) {
            // Log error but don't fail the request
            console.error('Error recording activity:', activityError);
        }

        res.status(200).json({
            success: true,
            message: "Code file deleted successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error deleting code file:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting code file"
        });
    }
};
