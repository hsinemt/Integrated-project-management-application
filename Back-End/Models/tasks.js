const mongoose = require('mongoose');

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
    image: {
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
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Assignation d'un étudiant

});

module.exports = mongoose.model('Task', taskSchema);