const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//const options = {discriminatorKey: 'role', collection: 'users'};

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
    verifyOtp: {
        type: String,
        default: ''
    },
    verifyOtpExpirationAt: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetOtp:{
        type: String,
        default: ''
    },
    resetOtpExpirationAt: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['admin', 'student', 'tutor', 'module manager'],
        required: true,
    }
});
 const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

 module.exports = UserModel;