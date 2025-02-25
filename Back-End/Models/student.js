const mongoose = require('mongoose');
const UserModel = require('./user');

const StudentSchema = new mongoose.Schema({
    speciality: {
        type: String
    },
    skills:{
        type: String
    },
    level:{
        type: String
    }

});
const StudentModel = UserModel.discriminator('student', StudentSchema);

module.exports= StudentModel;