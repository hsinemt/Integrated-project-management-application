const bcrypt = require("bcrypt");
const UserModel = require("../Models/User");


const signup = async (req, res) => {
    try {
        const  {name,lastname, email, password, role} = req.body;
        const user = await UserModel.findOne({ email });
        if (user) {
            return res.status(409)
                .json({message: `User already exists, you can login with email ${email}`,
                    success: false});
        }
        const userModel = new UserModel({name,lastname, email, password, role});
        userModel.password = await bcrypt.hash(password, 10);
        await userModel.save();
        res.status(201)
            .json({
                message: 'User successfully created',
                success: true
            })

    } catch(err) {
        res.status(500)
            .json({
                message: 'Internal Server Error',
                success: false
            })

    }
}
module.exports = {
    signup
};