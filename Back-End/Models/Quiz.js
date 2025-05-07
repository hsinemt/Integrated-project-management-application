const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  questions: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
      points: { type: Number, default: 1 },
    },
  ],
  answers: [String], // Réponses soumises par l'étudiant
  score: { type: Number, default: null, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Quiz", quizSchema);