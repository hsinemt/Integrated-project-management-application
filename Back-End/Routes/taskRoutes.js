const express = require('express');
const router = express.Router();
const taskController = require('../Controllers/taskController');
const cloudinary = require('cloudinary').v2;

const Project = require('../Models/Project');
const Task = require('../Models/tasks');

const multer = require('multer');
const upload = multer({ dest: 'uploadsimage/' });
const mongoose = require('mongoose');

router.post('/preview', taskController.previewTasks);
router.post('/save', taskController.saveTasks);

router.get('/:projectId/tasks', taskController.getTasksByProjectId);
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Update task image (with file upload)
router.put('/tasks/:taskId/image', upload.single('image'), async (req, res) => {
    const { taskId } = req.params;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
    }

    // Check if a file was uploaded
    if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
    }

    try {
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'tasks', // Optional: Organize images into folders
        });

        // Update task with the Cloudinary image URL
        const task = await Task.findByIdAndUpdate(
            taskId,
            { image: result.secure_url }, // Store the Cloudinary URL
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json(task);
    } catch (error) {
        console.error('Error updating task image:', error);
        res.status(500).json({ message: "Server error while updating task image" });
    }
});

// POST a new task for a specific project
router.post('/:projectId/tasks', async (req, res) => {
    const projectId = req.params.projectId;
    const { name, description, priority, date, état, image, studentId } = req.body;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
    }

    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
    }

    try {
        // Fetch the project to ensure it exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // If studentId is provided, check if the student exists in the users collection
        let student = null;
        if (studentId) {
            student = await User.findOne({ _id: studentId, role: "student" });
            if (!student) {
                return res.status(404).json({ message: "Student not found or not a student" });
            }
        }

        // Validate required fields
        if (!name || !description || !priority || !date) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Create a new task with student assigned
        const newTask = new Task({
            name,
            description,
            priority,
            date,
            état: état || 'To Do',
            image: image || null,
            project: projectId,
            group: project.group || null, // Assign the group from the project (if available)
            student: student ? student._id : null, // Assign student ID if provided
        });

        // Save the task to the database
        await newTask.save();

        // Return the created task
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Server error while creating task" });
    }
});

// Update task status
router.put('/tasks/:taskId/status', async (req, res) => {
    const { taskId } = req.params;
    const { etat } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
    }

    // Validate new status
    const validStatuses = ['To Do', 'In Progress', 'Completed', 'In Review'];
    if (!etat || !validStatuses.includes(etat)) {
        return res.status(400).json({ message: "Invalid status value" });
    }

    try {
        // Find and update the task
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { état: etat },
            { new: true } // Return the updated document
        );

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({ message: "Task status updated successfully", task: updatedTask });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Server error while updating task status" });
    }
});

// Get a task by ID
router.get('/tasks/:taskId', taskController.getTaskById);

// Save code to a task
router.put('/tasks/:taskId/code', taskController.saveTaskCode);

// Add a new code file to a task
router.post('/tasks/:taskId/codefile', taskController.addCodeFile);

// Delete a code file from a task
router.delete('/tasks/:taskId/codefile/:fileName', taskController.deleteCodeFile);

// Update a code file in a task
router.put('/tasks/:taskId/codefile/:fileName', taskController.updateCodeFile);

module.exports = router;
