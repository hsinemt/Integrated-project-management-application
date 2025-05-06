const mongoose = require('mongoose');

const codeFileSchema = new mongoose.Schema({
    code: {
        type: String,
        default: '',
        required: true
    },
    language: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    }
}, { timestamps: true });

// Create a compound index on taskId and fileName to ensure uniqueness
codeFileSchema.index({ taskId: 1, fileName: 1 }, { unique: true });

module.exports = mongoose.model('CodeFile', codeFileSchema);
