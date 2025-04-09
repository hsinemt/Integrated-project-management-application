const mongoose = require('mongoose');
const UserModel = require('./user');
//test
const StudentSchema = new mongoose.Schema({
    speciality: {
        type: String
    },
    skills: {
        type: [String], // 👈 this allows storing arrays like ['React', 'Node.js']
        default: []
    },
    level:{
        type: String
    }

});
const StudentModel = UserModel.discriminator('student', StudentSchema);

module.exports= StudentModel;