const mongoose = require('mongoose');
const UserModel = require('./User');

const TutorSchema = new mongoose.Schema({
    classe: {
        type: String,
    }
});

const TutorModel = UserModel.discriminator('tutor', TutorSchema);
module.exports = TutorModel;