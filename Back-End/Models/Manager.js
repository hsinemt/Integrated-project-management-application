const mongoose = require('mongoose');
const UserModel = require('./User');

const ManagerSchema = new mongoose.Schema({
    speciality: {
        type: String
    }
});

const ManagerModel = UserModel.discriminator('manager', ManagerSchema);
module.exports = ManagerModel;