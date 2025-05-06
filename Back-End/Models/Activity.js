const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actionType: {
        type: String,
        enum: ['create', 'update', 'delete'],
        required: true
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodeFile',
        required: false // Optional as specified in requirements
    },
    fileName: {
        type: String,
        required: true
    },
    fileLanguage: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }); // Add createdAt and updatedAt fields

// Create indexes for better query performance
activitySchema.index({ taskId: 1 }); // Index for querying activities by task
activitySchema.index({ userId: 1 }); // Index for querying activities by user
activitySchema.index({ timestamp: -1 }); // Index for sorting by timestamp (newest first)

module.exports = mongoose.model('Activity', activitySchema);