const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const options = { discriminatorKey: 'kid' };

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
    role: { 
        type: String, 
        enum: ["admin", "manager", "tutor", "student"], 
        default: "student" 
      }
    }, options);
    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
     module.exports = UserModel;