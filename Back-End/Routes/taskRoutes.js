const express = require('express');
const router = express.Router();
const taskController = require('../Controllers/taskController');
const cloudinary = require('cloudinary').v2;
const User = require('../Models/User');
const { userToken } = require('../Middlewares/UserValidation');

const Project = require('../Models/Project');
const Task = require('../Models/tasks');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ dest: 'uploadsimage/' });
const mongoose = require('mongoose');

const TutorModel = require('../Models/Tutor');
router.post('/preview', taskController.previewTasks);
router.post('/save', taskController.saveTasks);

router.get('/:projectId/tasks',userToken, taskController.getTasksByProjectId);
require('dotenv').config();
const { authMiddleware, isAdmin} = require('../Middlewares/UserValidation');
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
        // Find the task first
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check if status is actually changing
        if (task.état === etat) {
            return res.status(400).json({
                message: "Task already has this status",
                currentStatus: task.état
            });
        }

        // Record the current status in history before changing it
        // (optional - only if you want to track the transition)
        if (task.état) {
            task.statusHistory.push({
                status: task.état,
                changedAt: new Date()
            });
        }

        // Update the current status
        task.état = etat;

        // Add the new status to history
        task.statusHistory.push({
            status: etat,
            changedAt: new Date()
        });

        // Save the updated task
        const updatedTask = await task.save();

        res.json({
            message: "Task status updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Server error while updating task status" });
    }
});

// Add this to your tasks routes file
router.put('/tasks/:taskId/git', async (req, res) => {
    const { taskId } = req.params;
    const { git } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
    }

    // Validate git branch (basic validation - adjust as needed)
    if (typeof git !== 'string' || git.length > 255) {
        return res.status(400).json({ message: "Invalid git branch path" });
    }

    try {
        // Find and update the task
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { git },
            { new: true } // Return the updated document
        );

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({
            message: "Git branch updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating git branch:", error);
        res.status(500).json({
            message: "Server error while updating git branch"
        });
    }
});
router.put('/:id/note-git', async (req, res) => {
    try {
      const { id } = req.params;
      const { noteGit } = req.body;

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { noteGit },
        { new: true }
      );

      if (!updatedTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating Git note:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
router.get('/by-student/:studentId', async (req, res) => {
    try {
      const studentId = req.params.studentId;

      // Find student user
      const student = await User.findById(studentId).select('name lastname');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Fetch tasks
      const tasks = await Task.find({ assignedTo: studentId }).lean();

      res.json({
        success: true,
        student: {
          name: student.name,
          lastname: student.lastname,
        },
        tasks: tasks.map(task => ({
          ...task,
          _id: task._id.toString(),
          date: task.date.toISOString()
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Failed to load tasks"
      });
    }
  });

  router.get('/:taskId/commits', authMiddleware, async (req, res) => {
    try {
      // Find task by ID
      const task = await Task.findById(req.params.taskId);
      if (!task || !task.git) {
        return res.status(404).json({ message: 'Task or Git URL not found' });
      }

      // Get the tutor's information (assuming req.user contains the logged-in user info)
      const tutor = await TutorModel.findById(req.user.id);
      console.log("Tutor ID:", req.user.id);
      if (!tutor || !tutor.git) {
        return res.status(400).json({
          message: 'Tutor GitHub token not found',
          hint: 'Tutors need to set their GitHub token in their profile'
        });
      }

      // Extract repo info and branch from Git URL
      const gitUrl = task.git;
      const repoMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
      if (!repoMatch) {
        return res.status(400).json({ message: 'Invalid GitHub URL' });
      }

      const [_, owner, repo, branch] = repoMatch;
      const targetBranch = branch || 'main'; // Default to 'main' if branch not specified

      // Fetch commits using the tutor's GitHub token
      const { data: commits } = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits`,
        {
          params: { sha: targetBranch, per_page: 100 },
          headers: {
            Authorization: `token ${tutor.git}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      // Simplify commit data
      const commitData = commits.map(commit => ({
        message: commit.commit.message.split('\n')[0],
        timestamp: commit.commit.author.date,
        author: commit.commit.author.name,
        sha: commit.sha
      }));

      res.json({
        totalCommits: commits.length,
        commits: commitData
      });

    } catch (error) {
      console.error('Error fetching commits:', error);
      if (error.response) {
        if (error.response.status === 403) {
          return res.status(403).json({
            message: 'GitHub API rate limit exceeded or token invalid',
            hint: 'Tutor should check their GitHub token permissions'
          });
        }
        return res.status(error.response.status).json({
          message: error.response.data.message || 'GitHub API error'
        });
      }
      res.status(500).json({ message: 'Error fetching commit data' });
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