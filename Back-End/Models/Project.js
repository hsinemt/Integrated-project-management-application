const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },

});

// Prevent overwriting the model
module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
