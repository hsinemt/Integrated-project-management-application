const express = require('express');
const router = express.Router();
const taskController = require('../Controllers/taskController');
const cloudinary = require('cloudinary').v2;
const User = require('../Models/User');
const Project = require('../Models/Project');
const Task = require('../Models/tasks');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ dest: 'Uploadsimage/' });
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { authenticateJWT } = require('../Middlewares/authMiddleware');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const TutorModel = require('../Models/Tutor');
const { evaluateCommits } = require('../utils/gitEvaluator');
const { authMiddleware, isAdmin, userToken } = require('../Middlewares/UserValidation');
const { calculateTaskscoreProgress } = require('../utils/taskAnalyzer');

require('dotenv').config();

// Initialize services
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const QUIZ_GENERATION_TIMEOUT = 30000; // 30 seconds

// Email transporter setup with retry capability
if (!process.env.SENDER_EMAIL || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error('Error: SENDER_EMAIL, SMTP_USER, and SMTP_PASSWORD must be defined in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp-brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Basic task routes
router.post('/preview', taskController.previewTasks);
router.post('/save', taskController.saveTasks);
router.get('/:projectId/tasks', userToken, taskController.getTasksByProjectId);
router.get('/tasks/:taskId', taskController.getTaskById);

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

    const generateQuiz = async (retries = 3, delay = 1000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Quiz generation timed out after ${QUIZ_GENERATION_TIMEOUT}ms`));
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
        } catch (error) {
          console.warn(`Attempt ${attempt} failed: ${error.message}`);
          if (attempt === retries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    let result;
    try {
      result = await generateQuiz();
    } catch (error) {
      console.error('Erreurิ lors de la génération du quiz par Gemini:', error);
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
    const pointsPerQuestion = 2;
    const maxPoints = task.quizQuestions.length * pointsPerQuestion;

    task.quizQuestions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        points += pointsPerQuestion;
      }
    });

    const score = Math.round((points / maxPoints) * 100);
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

    let certificateSent = false;
    let userEmail = 'unknown';
    if (score === 100) {
      try {
        const user = await User.findById(req.user.id);
        if (user) {
          userEmail = user.email;
          await generateAndSendCertificate(task, req.user.id);
          certificateSent = true;
        } else {
          console.warn(`User not found for ID: ${req.user.id}`);
        }
      } catch (certError) {
        console.error('Error sending certificate:', certError);
      }
    }

    res.json({ 
      success: true,
      score,
      message: score === 100 && certificateSent ? 
        `Certificat envoyé à ${userEmail}` : 
        score === 100 && !certificateSent ? 
        'Quiz soumis avec succès, mais échec de l\'envoi du certificat' : 
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

// Helper function to generate and send certificate
async function generateAndSendCertificate(task, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 50 });
    doc.font('Helvetica');

    doc.lineWidth(2)
       .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .strokeColor('#000080')
       .stroke();

    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#000080')
       .text('Certificat d\'Achèvement', {
         align: 'center',
         lineGap: 10
       });

    doc.moveDown(2)
       .fontSize(20)
       .font('Helvetica')
       .fillColor('#333')
       .text(`Tâche: ${task.name}`, {
         align: 'center',
         lineGap: 8
       });

    doc.moveDown(1)
       .fontSize(18)
       .text(`Attribué à: ${user.name} ${user.lastname}`, {
         align: 'center',
         lineGap: 8
       });

    doc.moveDown(1)
       .fontSize(16)
       .text('Score: 100%', {
         align: 'center',
         lineGap: 8
       });

    const completionDate = new Date().toLocaleDateString('fr-FR');
    doc.moveDown(1)
       .fontSize(14)
       .fillColor('#555')
       .text(`Date d'achèvement: ${completionDate}`, {
         align: 'center',
         lineGap: 8
       });

    doc.moveDown(3)
       .fontSize(12)
       .fillColor('#777')
       .text('Félicitations pour votre excellent travail!', {
         align: 'center'
       });

    doc.end();

    const generatePdfBuffer = () => new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(new Error(`Erreur lors de la génération du PDF: ${err.message}`)));
    });

    const pdfBuffer = await generatePdfBuffer();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: `Certificat d'Achèvement pour ${task.name}`,
      text: `Cher(e) ${user.name} ${user.lastname},\n\nVotre certificat pour la tâche "${task.name}" est ci-joint.\n\nCordialement,\nL'équipe de gestion des tâches`,
      attachments: [{
        filename: `certificat-${task._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    const sendEmailWithRetry = async (options, retries = 3, delay = 2000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Sending certificate to ${options.to}`);
          await transporter.sendMail(options);
          console.log(`Certificate sent successfully to ${options.to}`);
          return;
        } catch (error) {
          console.warn(`Attempt ${attempt} failed: ${error.message}`);
          if (attempt === retries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    await sendEmailWithRetry(mailOptions);

  } catch (err) {
    console.error('Error sending certificate:', {
      message: err.message,
      stack: err.stack,
      userId,
      taskId: task._id,
      email: user ? user.email : 'unknown'
    });
    throw new Error(err.message || 'Échec de l\'envoi du certificat');
  }
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

// Update task image
router.put('/tasks/:taskId/image', upload.single('image'), async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'tasks',
    });

    const task = await Task.findByIdAndUpdate(
      taskId,
      { image: result.secure_url },
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

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID" });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    let student = null;
    if (studentId) {
      student = await User.findOne({ _id: studentId, role: "student" });
      if (!student) {
        return res.status(404).json({ message: "Student not found or not a student" });
      }
    }

    if (!name || !description || !priority || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newTask = new Task({
      name,
      description,
      priority,
      date,
      état: état || 'To Do',
      image: image || null,
      project: projectId,
      group: project.group || null,
      student: student ? student._id : null,
    });

    await newTask.save();

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

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const validStatuses = ['To Do', 'In Progress', 'Completed', 'In Review'];
  if (!etat || !validStatuses.includes(etat)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.état === etat) {
      return res.status(400).json({ 
        message: "Task already has this status",
        currentStatus: task.état
      });
    }

    if (task.état) {
      task.statusHistory.push({
        status: task.état,
        changedAt: new Date()
      });
    }

    task.état = etat;
    task.statusHistory.push({
      status: etat,
      changedAt: new Date()
    });

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

// Update git branch
router.put('/tasks/:taskId/git', async (req, res) => {
  const { taskId } = req.params;
  const { git } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  if (typeof git !== 'string' || git.length > 255) {
    return res.status(400).json({ message: "Invalid git branch path" });
  }

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { git },
      { new: true }
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

// Update git note
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

// Get tasks by student
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const student = await User.findById(studentId).select('name lastname');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

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

// Get task history
router.get('/:taskId/history', async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const task = await Task.findById(taskId)
      .select('statusHistory')
      .lean();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

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

// Get commits for a task
router.get('/:taskId/commits', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || !task.git) {
      return res.status(404).json({ message: 'Task or Git URL not found' });
    }

    const tutor = await TutorModel.findById(req.user.id);
    if (!tutor || !tutor.git) {
      return res.status(400).json({ 
        message: 'Tutor GitHub token not found',
        hint: 'Tutors need to set their GitHub token in their profile'
      });
    }

    const gitUrl = task.git;
    const repoMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
    if (!repoMatch) {
      return res.status(400).json({ message: 'Invalid GitHub URL' });
    }

    const [_, owner, repo, branch] = repoMatch;
    const targetBranch = branch || 'main';

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


router.get('/:taskId/evaluate', authMiddleware, async (req, res) => {
  try {
    // 1. Récupérer la tâche
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    // 2. Vérifier l'URL Git
    if (!task.git) {
      return res.status(400).json({ message: 'URL Git non fournie' });
    }

    // 3. Récupérer le token GitHub du tuteur
    const tutor = await TutorModel.findById(req.user.id);
    if (!tutor || !tutor.git) {
      return res.status(400).json({
        message: 'Token GitHub du tuteur non configuré',
        hint: 'Le tuteur doit configurer son token GitHub dans son profil'
      });
    }

    // 4. Extraire owner/repo/branch de l'URL
    const gitUrl = task.git;
    const repoMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
    if (!repoMatch) {
      return res.status(400).json({ message: 'URL GitHub invalide' });
    }

    const [_, owner, repo, branch] = repoMatch;
    const targetBranch = branch || 'main';

    // 5. Récupérer les commits via l'API GitHub
    const { data: commits } = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits`,
        {
          params: {
            sha: targetBranch,
            per_page: 100
          },
          headers: {
            Authorization: `token ${tutor.git}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
    );

    // 6. Formater les données des commits
    const formattedCommits = commits.map(commit => ({
      message: commit.commit.message.split('\n')[0],
      sha: commit.sha,
      date: commit.commit.author.date,
      author: commit.commit.author.name
    }));

    // 7. Évaluer les commits avec la nouvelle fonction
    const evaluationResult = evaluateCommits(formattedCommits);
    const { noteGit, evaluationDetails } = evaluationResult;

    // 8. Mettre à jour la tâche
    task.noteGit = noteGit;
    await task.save();

    // 9. Retourner la réponse avec le détail du calcul
    res.json({
      success: true,
      noteGit,
      evaluationDetails,
      totalCommits: commits.length,
      evaluatedCommits: formattedCommits.length,
      sampleCommits: formattedCommits.slice(0, 3),
      branch: targetBranch
    });

  } catch (error) {
    console.error('Erreur détaillée:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    if (error.response) {
      if (error.response.status === 401) {
        return res.status(401).json({
          message: 'Token GitHub invalide',
          hint: 'Le tuteur doit mettre à jour son token dans son profil'
        });
      }
      if (error.response.status === 404) {
        return res.status(404).json({
          message: 'Dépôt GitHub non trouvé',
          hint: 'Vérifiez que le dépôt existe et est accessible'
        });
      }
      return res.status(error.response.status).json({
        message: 'Erreur GitHub API',
        details: error.response.data
      });
    }

    res.status(500).json({
      message: 'Erreur lors de l\'évaluation des commits',
      error: error.message
    });
  }
});

router.get('/:taskId/progress-analysis', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const analysis = calculateTaskscoreProgress(task);

    // Save to database with progressScore field
    task.progressAnalysis = {
      scoreProgress: analysis.scoreProgress,  // Updated field name
      details: analysis.details
    };
    await task.save();

    res.json({
      success: true,
      scoreProgress: analysis.scoreProgress,  // Updated field name
      analysisDetails: analysis.details,
      message: "Progress analysis completed successfully"
    });

  } catch (error) {
    console.error("Progress analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Error in progress analysis",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Code-related routes
router.put('/tasks/:taskId/code', taskController.saveTaskCode);
router.post('/tasks/:taskId/codefile', taskController.addCodeFile);
router.delete('/tasks/:taskId/codefile/:fileName', taskController.deleteCodeFile);
router.put('/tasks/:taskId/codefile/:fileName', taskController.updateCodeFile);

// Project and group routes
router.get("/projects", taskController.getAllProjects);
router.get("/groups", taskController.getAllGroups);

module.exports = router;