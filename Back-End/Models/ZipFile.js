const mongoose = require('mongoose');

// Schema for individual files within a zip submission
const zipFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        default: 'unknown'
    },
    fileLanguage: {
        type: String,
        default: 'unknown'
    },
    fileSize: {
        type: Number,
        default: 0
    },
    relativePath: {
        type: String,
        default: ''
    },
    // Reference to the student who owns this file
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Reference to the task this file is associated with
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    // Reference to individual file analysis if available
    analysisResult: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodeMark',
        default: null
    }
});

// Main schema for zip files
const zipFilesSchema = new mongoose.Schema({
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
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    submissionId: {
        type: String,
        required: true,
        unique: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        default: 'zip'
    },
    status: {
        type: String,
        enum: ['Uploaded', 'Processing', 'Pending', 'Analyzed', 'Failed', 'Reviewed'],
        default: 'Uploaded'
    },
    extractedPath: {
        type: String,
        default: null
    },
    // Array of files contained in the zip
    files: [zipFileSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ZipFile', zipFilesSchema, 'zipfiles');
