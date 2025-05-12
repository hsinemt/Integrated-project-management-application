const mongoose = require('mongoose');

const FinalGradeSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    customGrade: {
        score: {
            type: Number,
            min: 0,
            max: 20,
            required: true
        },
        weight: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        }
    },
    weights: {
        quizWeight: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        progressWeight: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        gitWeight: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        codeWeight: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        }
    },
    finalGrade: {
        type: Number,
        min: 0,
        max: 20,
        required: true
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

module.exports = mongoose.model('FinalGrade', FinalGradeSchema); 