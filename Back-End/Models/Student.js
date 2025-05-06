const mongoose = require('mongoose');
const UserModel = require('./User');
//test
const StudentSchema = new mongoose.Schema({
    speciality: {
        type: String,
        required: false,
        validate: {
            validator: function(v) {
                return ['Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic'].includes(v);
            },
            message: props => `${props.value} is an invalid speciality!`
        },
        default: 'Twin'
    },
    skills:{
        type: [String],
        default: []
    },
    level:{
        type: String
    }

});
const StudentModel = UserModel.discriminator('student', StudentSchema);

module.exports= StudentModel;
