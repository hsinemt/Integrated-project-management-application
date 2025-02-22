const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  githubId: { type: String, unique: true },
  googleId: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true },
  displayName: String,
  profileUrl: String,
  email: { type: String, unique: true, sparse: true },
  avatarUrl: String
});

module.exports = mongoose.model('User', userSchema);
