const mongoose = require('mongoose');
const UserModel = require('./user');


const TutorSchema = new mongoose.Schema({
    classe: {
        type: String,
    },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Groupe" }]
});

const TutorModel = UserModel.discriminator('tutor', TutorSchema);
module.exports = TutorModel;