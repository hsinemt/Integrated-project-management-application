const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
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
        minlength: 8,
    },
    birthday: {
        type: Date,
        required: true,
    },
    images: {
        type: String,
        required: false,
    },
    skills: {
        type: [String],
        default: [],
    },
    role: {
        type: String,
        enum: ["admin", "student", "tutor", "module manager"],
        required: true,
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Groupes", // Reference to the Group model
        required: false, // Not all users may belong to a group (e.g., admins)
    },
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = UserModel;