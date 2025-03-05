const mongoose = require('mongoose');
const UserModel = require('./User');
//test
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