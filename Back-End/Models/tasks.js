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
}, { _id: false });

// Define the question subdocument schema
const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true }
}, { _id: true });

// Progress analysis sub-schema
const progressAnalysisSchema = new mongoose.Schema({
    scoreProgress: {
        type: Number,
        min: 0,
        max: 20
    },
    details: {
        timeManagement: Number,
        statusEvolution: Number,
        speedBonus: Number,
        isLate: Boolean,
        completionDays: Number,
        statusTransitions: Number,
        lastUpdate: Date
    }
}, { _id: false });

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
        type: Number,
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
        ref: 'Groupes',
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    quizQuestions: [questionSchema],
    progressAnalysis: progressAnalysisSchema
}, {
    timestamps: true  // Correct placement as schema option
});

module.exports = mongoose.model('Task', taskSchema);