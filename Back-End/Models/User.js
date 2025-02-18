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
    role: { 
        type: String, 
        enum: ["admin", "manager", "tutor", "student"], 
        default: "student" 
      }
});
 const UserModel = mongoose.model('User', UserSchema);
 module.exports = UserModel;