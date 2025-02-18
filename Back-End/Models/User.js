const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        length: 8,
    },
    // birthday: {
    //     type: Date,
    //     required: true,
    // },
    role: {
        type: String,
        enum: ['admin', 'student', 'tutor', 'module manager'],
        required: true,
    }
});
 const UserModel = mongoose.model('User', UserSchema);
 module.exports = UserModel;