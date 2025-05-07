const express = require("express");
const router = express.Router();
const Task = require("../Models/Task");
const axios = require("axios");
const jwt = require("jsonwebtoken");
// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token manquant" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Token invalide" });
    }
    req.user = user;
    next();
  });
};

// Endpoint pour générer un quiz basé sur une tâche
router.post("/api/quiz/generate", authenticateToken, async (req, res) => {
  const { task, numberOfQuestions } = req.body;

  try {
    // Vérifier si la tâche existe
    const existingTask = await Task.findById(task._id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Tâche non trouvée" });
    }

    // Vérifier si un quiz a déjà été complété
    if (existingTask.quizScore !== null) {
      return res.status(400).json({
        success: false,
        message: "Un quiz a déjà été complété pour cette tâche",
      });
    }

    // Préparer le prompt pour l'API Gemini
    const prompt = `
      Generate a quiz with ${numberOfQuestions} multiple-choice questions based on the following task:
      Task Name: ${task.name}
      Task Description: ${task.description}
      Project ID: ${task.projectId}
      Each question should have 4 answer options, with one correct answer. Return the quiz in JSON format with the following structure:
      {
        "questions": [
          {
            "question": "Question text",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctAnswer": "Option 1"
          },
          ...
        ]
      }
    `;

    // Appeler l'API Gemini
    const iaResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY, // Utiliser GEMINI_API_KEY
        },
      }
    );

    // Extraire les questions de la réponse
    const responseText = iaResponse.data.candidates[0].content.parts[0].text;
    let questions;
    try {
      // Supprimer les éventuelles balises de code markdown (```json ... ```)
      const cleanedText = responseText.replace(/```json\n|```/g, "");
      questions = JSON.parse(cleanedText).questions;
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      return res.status(500).json({
        success: false,
        message: "Erreur lors du traitement de la réponse de l'IA",
      });
    }

    // Ajouter les points à chaque question
    const formattedQuestions = questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: 1,
    }));

    // Sauvegarder les questions dans la collection Quiz
    const quiz = new Quiz({
      taskId: task._id,
      questions: formattedQuestions,
      studentId: existingTask.assignedTo,
      createdAt: new Date(),
    });
    await quiz.save();

    res.json({ success: true, questions: formattedQuestions, quizId: quiz._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de la génération du quiz" });
  }
});

// Autres endpoints (submit, history) restent inchangés
router.post("/api/quiz/submit", authenticateToken, async (req, res) => {
  const { taskId, quizId, questions, answers } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Tâche non trouvée" });
    }
    if (task.quizScore !== null) {
      return res.status(400).json({
        success: false,
        message: "Un quiz a déjà été complété pour cette tâche",
      });
    }
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz non trouvé" });
    }

    let score = 0;
    const feedback = questions.map((question, index) => {
      const isCorrect = question.correctAnswer === answers[index];
      if (isCorrect) {
        score += question.points;
      }
      return {
        question: question.question,
        selectedAnswer: answers[index],
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    task.quizScore = score;
    await task.save();

    quiz.answers = answers;
    quiz.score = score;
    quiz.submittedAt = new Date();
    await quiz.save();

    res.json({ success: true, score, feedback });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de la soumission du quiz" });
  }
});

router.get("/api/quiz/history/:taskId", authenticateToken, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ taskId: req.params.taskId })
      .populate("studentId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de l'historique des quiz" });
  }
});

module.exports = router;