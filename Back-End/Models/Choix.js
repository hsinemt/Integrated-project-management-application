const mongoose = require('mongoose');
const GroupeModel = require('./Group');

const ChoixSchema = new mongoose.Schema({
    list_projects: [{
        id_project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        motivation: { type: String, required: true }
    }]
});

const ChoixModel = GroupeModel.discriminator('choix', ChoixSchema);
module.exports = ChoixModel;
