const mongoose = require("mongoose");

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

});


const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = UserModel;
