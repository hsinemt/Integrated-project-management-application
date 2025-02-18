const bcrypt = require("bcrypt");
const UserModel = require("../Models/User");


const signup = async (req, res) => {
    try {
        const  {name, email, password, birthday} = req.body;
        const user = await UserModel.findOne({ email });
        if (user) {
            return res.status(409)
                .json({message: `User already exists, you can login with email ${email}`,
                    success: false});
        }
        const userModel = new UserModel({name, email, password, birthday});
        userModel.password = await bcrypt.hash(password, 10);
        await userModel.save();
        res.status(201)
            .json({
                message: 'User successfully created',
                success: true
            })

    } catch(err) {
        console.log(err);
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