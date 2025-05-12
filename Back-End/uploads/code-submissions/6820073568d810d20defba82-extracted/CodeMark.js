const mongoose = require('mongoose');

const codeMarkSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissionId: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    sonarResults: {
        type: Object,
        default: {}
    },
    sonarProjectKey: {
        type: String
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    detailedScores: {
        type: Object,
        default: {
            correctnessScore: 0,
            securityScore: 0,
            maintainabilityScore: 0,
            documentationScore: 0,
            cleanCodeScore: 0,
            simplicityScore: 0,
            rawMetrics: {
                bugs: 0,
                vulnerabilities: 0,
                codeSmells: 0,
                duplicatedLinesDensity: 0,
                complexity: 0,
                commentLinesDensity: 0,
                totalLines: 0,
                reliabilityRating: 1,
                securityRating: 1,
                maintainabilityRating: 1
            }
        }
    },
    feedback: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Processing', 'Pending', 'Reviewed', 'Failed'],
        default: 'Pending'
    },
    tutorReview: {
        reviewed: {
            type: Boolean,
            default: false
        },
        score: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        feedback: {
            type: String,
            default: ''
        },
        tutor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewDate: {
            type: Date
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
});

module.exports = mongoose.model('CodeMark', codeMarkSchema);