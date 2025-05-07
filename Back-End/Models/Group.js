const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupeSchema = new Schema({
    nom_groupe: { type: String, required: true },
    id_students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    id_tutor: { type: Schema.Types.ObjectId, ref: 'Tutor', default: null },
    id_project: { type: Schema.Types.ObjectId, ref: 'Project', default: null }
}, { discriminatorKey: 'type', collection: 'groupes' });

// Check if model already exists before defining it
module.exports = mongoose.models.Groupes || mongoose.model('Groupes', GroupeSchema);