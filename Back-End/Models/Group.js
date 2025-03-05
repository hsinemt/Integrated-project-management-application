const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupeSchema = new Schema({
    nom_groupe: { type: String, required: true },
    id_students: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Reference to User model (students)
    id_tutor: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Reference to User model (tutor)
    id_projects: [{ type: Schema.Types.ObjectId, ref: 'Project', default: [] }] // Reference to Project model
}, { collection: 'groupes' });

const GroupeModel = mongoose.model('Groupes', GroupeSchema);
module.exports = GroupeModel;