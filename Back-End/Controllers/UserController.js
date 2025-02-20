const { transporter } = require('../Config/nodemailer');
const bcrypt = require('bcrypt');
const UserModel = require("../Models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');


const signup = async (req, res) => {
    try {
        const  {name, lastname, email, password, role} = req.body;
        const existingUser = await UserModel.findOne({email});
        if (existingUser) {
            return res.status(409)
                .json({message: `User already exists, you can login with email ${email}`,
                    success: false});
        }
        const user = new UserModel({name, lastname, email, password, role});
        user.password = await bcrypt.hash(password, 10);
        await user.save();

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '2d'});
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none':'strict',
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'welcome to our platform',
            text: `Welcome to our platform. Your account has been registered with email: ${email}`
        }

        await transporter.sendMail(mailOptions);

        res.status(201)
            .json({
                message: 'User successfully created',
                success: true
            })
    } catch(err) {
        console.error("error in signup",err);
        res.status(500)
            .json({
                message: 'Internal Server Error',
                success: false,
                error: err.message
            });

    }
};

// const login = async (req, res) => {
//     const { email, password } = req.body;
//
//     if (!email || !password) {
//         return res.json({success: false, message: 'Email and password are required'})
//     }
//     try {
//         const user = await UserModel.findOne({email});
//         if (!user) {
//             return res.status(404).json({success: false, message: 'Invalid email'});
//         }
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(404).json({success: false, message: 'Invalid password'})
//         }
//         const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '2d'});
//         res.cookie('token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: process.env.NODE_ENV === 'production' ? 'none':'strict',
//             maxAge: 2 * 24 * 60 * 60 * 1000
//         });
//         return res.json({success: true, message: `${email} You are logged in successfully `});
//
//     }catch(err) {
//         return res.json({success: false, message: err.message});
//     }
// }

//send the verification code
const sendVerifyOtp = async (req, res) => {
    try{
        const {userId} = req.body;

        const user = await UserModel.findById( userId );
        if(user.isVerified){
            return res.json({success: false, message:"account already verified"});
        }

       const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExpirationAt = Date.now() + 24 * 60 * 60 * 1000

        await user.save();

        const mailOption = {
                from: process.env.SENDER_EMAIL,
                to: user.email,
                subject: 'Account verification OTP',
                text: `your OTP is ${otp}. Verify Your Account using this otp`
        }
        await transporter.sendMail(mailOption);
        res.json({success: true, message: `Verfifcation OTP sent on email ${user.email}`});

    }catch(err){
        res.json({success: false, message: err.message});
    }
}


const verifyEmail = async (req, res) => {

    const {userId, otp} = req.body;
    if(!userId || !otp){
        return res.json({success: false, message:"Missing details"});
    }
    try{
        const user = await UserModel.findById(userId);

        if(!user){
            return res.json({success: false, message:"User not found"});
        }
        if (user.verifyOtp ==='' || user.verifyOtp !== otp){
            return res.json({success: false, message:"Invalid Otp"});
        }
        if(user.verifyOtpExpirationAt < Date.now()){
            return res.json({success: false, message:"Otp Expired"});
        }
        user.isVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpirationAt = 0;
        await user.save();
        return res.json({success: true, message:"Successfully verified"});
    }catch(err){
        return res.json({success: false, message: err.message});
    }
}
module.exports = {
    signup,
    sendVerifyOtp,
    verifyEmail,
    // login
};