const mongoose = require('mongoose');

const CodeMarkSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tasks',
        required: false
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    assessment: {
        criteria: {
            correctness: {
                score: { type: Number, min: 0, max: 4 },
                feedback: String
            },
            efficiency: {
                score: { type: Number, min: 0, max: 4 },
                feedback: String
            },
            readability: {
                score: { type: Number, min: 0, max: 4 },
                feedback: String
            },
            documentation: {
                score: { type: Number, min: 0, max: 4 },
                feedback: String
            },
            bestPractices: {
                score: { type: Number, min: 0, max: 4 },
                feedback: String
            }
        },
        overallFeedback: String,
        score: {
            type: Number,
            min: 0,
            max: 20
        }
    },
    tutorReview: {
        approved: {
            type: Boolean,
            default: null
        },
        comments: String,
        adjustedScore: {
            type: Number,
            min: 0,
            max: 20
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('CodeMark', CodeMarkSchema);