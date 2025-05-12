const mongoose = require('mongoose');

// Define the status history subdocument schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed', 'In Review'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // We don't need IDs for subdocuments
// Define the question subdocument schema
const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true }
}, { _id: true }); // Ensure each question has an _id

// Main task schema
const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    état: {
        type: String,
        enum: ['To Do', 'In Progress', 'Completed', 'In Review'],
        default: 'To Do',
    },
    statusHistory: [statusHistorySchema],
    noteGit: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false,
    },
    git: {
        type: String,
        required: false,
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Groupes', // Reference to the Groupe model
        required: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Keep the original fields for backward compatibility
    code: {
        type: String,
        required: false,
    },
    codeLanguage: {
        type: String,
        required: false,
    },
    codeFileName: {
        type: String,
        required: false,
    },
    // New field for referencing code files by ID
    codeFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodeFile'
    }],
    quizScore: {
        type: Number,
        required: false,
        default: null
    },
    quizId: {
        type: String,
        required: false
    },
    quizTheme: String,
    quizQuestions: [questionSchema] // New field to store quiz questions
});

module.exports = mongoose.model('Task', taskSchema);