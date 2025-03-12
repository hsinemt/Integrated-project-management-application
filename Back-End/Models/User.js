const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const options = {discriminatorKey: 'role', collection: 'users'};

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
    avatar: {
        type: String,
        default: function() {
            // Safely get initials with fallbacks
            const nameInitial = this.name && typeof this.name === 'string' ? this.name.charAt(0).toUpperCase() : 'U';
            const lastnameInitial = this.lastname && typeof this.lastname === 'string' ? this.lastname.charAt(0).toUpperCase() : '';
            const initials = nameInitial + lastnameInitial;

            // Get color based on role with fallback
            const roleColor = getRoleColor(this.role);

            return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=${roleColor}`;
        }
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
        enum: ['admin', 'student', 'tutor', 'manager'],
        required: true,
    }
},options);

function getRoleColor(role) {
    switch(role) {
        case 'admin': return '8e44ad';
        case 'manager': return '2980b9';
        case 'tutor': return '27ae60';
        case 'student': return 'e67e22';
        default: return '7f8c8d';
    }
}
 const UserModel = mongoose.model('User', UserSchema);

 module.exports = UserModel;