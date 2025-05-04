const mongoose = require('mongoose');
const UserModel = require('./User');

const ManagerSchema = new mongoose.Schema({
    speciality: {
        type: String,
        required: true,
        enum: ['Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic']
    }
});

const ManagerModel = UserModel.discriminator('manager', ManagerSchema);
module.exports = ManagerModel;