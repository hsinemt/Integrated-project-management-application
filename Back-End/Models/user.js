const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const options = { discriminatorKey: 'role', collection: 'users' };

const UserSchema = new Schema({
    name: {
        type: String,
        required: false, // Optionnel pour OAuth
        default: ''
    },
    lastname: {
        type: String,
        required: false, // Optionnel pour OAuth (corrigé ici)
        default: ''
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: false, // Optionnel pour OAuth
        minlength: 8 // Correction de "length" à "minlength"
    },
    avatar: {
        type: String,
        default: function() {
            const nameInitial = this.name && typeof this.name === 'string' ? this.name.charAt(0).toUpperCase() : 'U';
            const lastnameInitial = this.lastname && typeof this.lastname === 'string' ? this.lastname.charAt(0).toUpperCase() : '';
            const initials = nameInitial + lastnameInitial;

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
    resetOtp: {
        type: String,
        default: ''
    },
    resetOtpExpirationAt: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['admin', 'student', 'tutor', 'manager'], // Valeurs valides
        required: true,
        default: 'student' // Valeur par défaut
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    username: {
        type: String
    },
    displayName: {
        type: String
    },
    profileUrl: {
        type: String
    },
    images: { type: String, required: false },
    birthday: { type: Date, required: false },
}, options);

function getRoleColor(role) {
    switch(role) {
        case 'admin': return '8e44ad';
        case 'manager': return '2980b9';
        case 'tutor': return '27ae60';
        case 'student': return 'e67e22';
        default: return '7f8c8d';
    }
}

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = UserModel;