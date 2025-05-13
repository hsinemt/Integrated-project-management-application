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

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { authenticateJWT } = require('../Middlewares/authMiddleware');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const TutorModel = require('../Models/Tutor');
router.post('/preview', taskController.previewTasks);
router.post('/save', taskController.saveTasks);

router.get('/:projectId/tasks',userToken, taskController.getTasksByProjectId);
require('dotenv').config();
const { authMiddleware, isAdmin } = require('../Middlewares/UserValidation');

// Initialize Services
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const QUIZ_GENERATION_TIMEOUT = 30000; // 30 seconds

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD
    }
});

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
// Generate quiz for a task
router.get('/tasks/:taskId/quiz', authenticateJWT, async (req, res) => {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ success: false, message: 'ID de tâche invalide' });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Tâche non trouvée' });
        }

        if (!task.quizTheme) {
            return res.status(400).json({
                success: false,
                message: 'Aucun thème de quiz défini pour cette tâche'
            });
        }

        console.log(`Génération quiz pour tâche ${taskId} - Thème: ${task.quizTheme}`);

        // Check if quiz already exists in the task
        if (task.quizQuestions && task.quizQuestions.length > 0) {
            return res.json({
                success: true,
                quiz: {
                    quizId: task.quizId,
                    taskTheme: task.quizTheme,
                    questions: task.quizQuestions
                }
            });
        }

        const prompt = `
      Génère un quiz en français avec 5 questions sur ${task.quizTheme}.
      Exigences:
      - Questions spécifiques à ${task.quizTheme}
      - 4 options par question
      - Format JSON strict:
      {
        "taskTheme": "${task.quizTheme}",
        "questions": [
          {
            "text": "Question spécifique?",
            "options": ["Option1", "Option2", "Option3", "Option4"],
            "correctAnswer": 0
          }
        ]
      }
      - Uniquement le JSON, pas de texte supplémentaire
    `;

        const generateQuiz = () => new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Quiz generation timed out'));
            }, QUIZ_GENERATION_TIMEOUT);

            model.generateContent(prompt)
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });

        let result;
        try {
            result = await generateQuiz();
        } catch (error) {
            console.error('Erreur lors de la génération du quiz par Gemini:', error);
            return res.status(500).json({
                success: false,
                message: 'Échec de la génération du quiz - timeout ou erreur API',
                error: error.message
            });
        }

        const response = await result.response;
        let responseText = response.text();

        responseText = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        let quiz;
        try {
            quiz = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Réponse brute de Gemini:', responseText);
            return res.status(500).json({
                success: false,
                message: 'Erreur de parsing du quiz',
                error: parseError.message
            });
        }

        if (quiz.taskTheme !== task.quizTheme) {
            return res.status(500).json({
                success: false,
                message: `Incohérence de thème: ${quiz.taskTheme} au lieu de ${task.quizTheme}`
            });
        }

        const quizId = new mongoose.Types.ObjectId().toString();
        const questionsWithIds = quiz.questions.map(question => ({
            ...question,
            _id: new mongoose.Types.ObjectId().toString()
        }));

        const updateResult = await Task.updateOne(
            { _id: taskId },
            {
                $set: {
                    quizId: quizId,
                    quizQuestions: questionsWithIds
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(500).json({
                success: false,
                message: 'Échec de la mise à jour du quizId dans la tâche'
            });
        }

        res.json({
            success: true,
            quiz: {
                quizId,
                taskTheme: quiz.taskTheme,
                questions: questionsWithIds
            }
        });

    } catch (error) {
        console.error('Erreur génération quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Échec de la génération du quiz',
            error: error.message
        });
    }
});

// Submit quiz answers
router.post('/tasks/:taskId/quiz-submit', authenticateJWT, async (req, res) => {
    const { taskId } = req.params;
    const { answers, quizId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ success: false, message: 'ID de tâche invalide' });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Tâche non trouvée'
            });
        }

        if (!task.quizQuestions || task.quizQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz non trouvé pour cette tâche'
            });
        }

        if (task.quizId !== quizId) {
            return res.status(400).json({
                success: false,
                message: 'ID de quiz invalide'
            });
        }

        let points = 0;
        const pointsPerQuestion = 2; // 2 points per correct answer
        const maxPoints = task.quizQuestions.length * pointsPerQuestion; // 10 points for 5 questions

        task.quizQuestions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) { // Compare indices directly
                points += pointsPerQuestion;
            }
        });

        const score = Math.round((points / maxPoints) * 100); // Convert to percentage
        console.log(`Calculated score for task ${taskId}: ${points}/${maxPoints} = ${score}%`);

        const updateResult = await Task.updateOne(
            { _id: taskId },
            { $set: { quizScore: score } }
        );

        console.log('Update result:', updateResult);

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucune tâche correspondante trouvée pour mise à jour'
            });
        }

        if (updateResult.modifiedCount === 0) {
            console.log('No modification needed, score might already be set');
        }

        if (score === 100) {
            await generateAndSendCertificate(task, req.user.id);
        }

        res.json({
            success: true,
            score,
            message: score === 100 ?
                'Certificat envoyé par email' :
                'Quiz soumis avec succès'
        });

    } catch (error) {
        console.error('Erreur soumission quiz:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
});

// Fonction helper pour le certificat
async function generateAndSendCertificate(task, userId) {
    const user = await User.findById(userId);
    if (!user) return;

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    doc.text(`Certificat pour ${task.name}`, 100, 100);
    doc.text(`Utilisateur: ${user.name} ${user.lastname}`, 100, 150);
    doc.text(`Score: 100%`, 100, 200);
    doc.end();

    const generatePdfBuffer = () => new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: `Certificat pour ${task.name}`,
        text: `Félicitations pour votre score parfait!`,
        attachments: [{
            filename: `certificat-${task._id}.pdf`,
            content: await generatePdfBuffer()
        }]
    };

    await transporter.sendMail(mailOptions);
}

// Update quiz theme
router.put('/tasks/:taskId/quiz-theme', authenticateJWT, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { quizTheme } = req.body;

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const task = await Task.findByIdAndUpdate(
            taskId,
            { quizTheme },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({
            success: true,
            message: "Quiz theme updated successfully",
            task
        });
    } catch (error) {
        console.error('Error updating quiz theme:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update quiz theme",
            error: error.message
        });
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

router.get('/:taskId/history', async (req, res) => {
    const { taskId } = req.params;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
        // Find task by ID and select only the statusHistory field
        const task = await Task.findById(taskId)
            .select('statusHistory')
            .lean();

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Sort history by changedAt date (most recent first)
        const sortedHistory = (task.statusHistory || []).sort((a, b) =>
            b.changedAt - a.changedAt
        );

        res.status(200).json({
            success: true,
            history: sortedHistory
        });
    } catch (error) {
        console.error("Error fetching task history:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching task history"
        });
    }
});

router.get("/projects", taskController.getAllProjects);
router.get("/groups", taskController.getAllGroups);
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