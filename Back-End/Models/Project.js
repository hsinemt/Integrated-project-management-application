const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Project title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Project description is required'],
        trim: true
    },
    keywords: {
        type: [String],
        required: [true, 'At least one keyword is required'],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'At least one keyword is required'
        }
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard', 'Very Hard'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
        default: 'Not Started'
    },
    projectLogo: {
        type: String,
        default: null
    },
    speciality: {
        type: String,
        enum: ['Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic']
    },
    creator: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String,
        lastname: String,
        email: String,
        role: String,
        avatar: String
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

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);