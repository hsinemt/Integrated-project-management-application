const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('./User');
// const GroupeSchema = new Schema({
//     nom_groupe: { type: String, required: true },
//     id_students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
//     id_tutor: { type: Schema.Types.ObjectId, ref: 'Tutor', default: null },
//     id_project: { type: Schema.Types.ObjectId, ref: 'Project', default: null }
// }, { discriminatorKey: 'type', collection: 'groupes' });

const GroupeSchema = new Schema({
    nom_groupe: { type: String, required: true },
    id_students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    id_tutor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    id_project: { type: Schema.Types.ObjectId, ref: 'Project', default: null }
}, { discriminatorKey: 'type', collection: 'groupes' });


module.exports = mongoose.models.Groupes || mongoose.model('Groupes', GroupeSchema);