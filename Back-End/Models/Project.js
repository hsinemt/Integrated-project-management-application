const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Groupes',
        required: true,
    },
});

// Prevent overwriting the model
module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
