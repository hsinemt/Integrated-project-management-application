const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    }
});

const ProjectModel=mongoose.model('Projects', ProjectSchema);
module.exports = ProjectModel;
