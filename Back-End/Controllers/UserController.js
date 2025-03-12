const { transporter } = require('../Config/nodemailer');
const bcrypt = require('bcrypt');
const UserModel = require("../Models/User");
const TutorModel = require("../Models/Tutor");
const ManagerModel = require("../Models/Manager");
const StudentModel = require("../Models/Student");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const User = require('../Models/User');


const signup = async (req, res) => {
    try {
        const  {name, lastname, email, password, role} = req.body;
        //optional for the test
        if (role !== 'student') {
            return res.status(403).json({
                success: false,
                message: "you can't signup with this access"
            })
        }
        const existingUser = await UserModel.findOne({email});
        if (existingUser) {
            return res.status(409)
                .json({message: `User already exists, you can login with email ${email}`,
                    success: false});
        }
        const user = new UserModel({name, lastname, email, password, role});
        user.password = await bcrypt.hash(password, 10);
        await user.save();

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1h'});
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
        };
        await transporter.sendMail(mailOptions);

        //await sendVerifyOtp({ body: { userId: user._id } }, res);
        // try {
        //     await sendVerifyOtp({ userId: user._id  });
        // } catch (otpError) {
        //     console.error("Error sending OTP:", otpError);
        // }

        res.status(201)
            .json({
                message: 'User successfully created',
                success: true,
                email: email,
                token,
                user: { id: user._id, name, lastname, email, role, avatar: user.avatar }
            });
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

const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.json({success: false, message: 'Email and password are required'})
    }
    try {
        const user = await UserModel.findOne({email});
        if (!user) {
            return res.status(404).json({success: false, message: 'Invalid email'});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(404).json({success: false, message: 'Invalid password'})
        }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '2d'});
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none':'strict',
            maxAge: 2 * 24 * 60 * 60 * 1000
        });
        return res.json({
            success: true,
            message: `${email} You are logged in successfully`,
            token,
            user: { id: user._id, email: user.email, role: user.role, avatar: user.avatar },
        });

    }catch(err) {
        return res.json({success: false, message: err.message});
    }
}

//send the verification code

const sendVerifyOtp = async (req, res) => {
    try {
        const { email } = req.body;
        //console.log("Received request to send OTP to:", email);
        const user = await UserModel.findOne({ email });
        if (!user) {
            console.log("User not found:", email);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.isVerified) {
            //console.log("User already verified:", email);
            return res.status(400).json({ success: false, message: 'Account already verified' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        //console.log("Generated OTP:", otp);

        user.verifyOtp = otp;
        user.verifyOtpExpirationAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account verification OTP',
            text: `Your OTP is ${otp}. Verify your account using this OTP.`,
        };

        //console.log("Sending email to:", user.email);
        await transporter.sendMail(mailOption);

        res.json({ success: true, message: `Verification OTP sent to ${user.email}` });
    } catch (err) {
        console.error("Error sending OTP:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

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
};

const addManager = async (req, res) => {
    try {
        const { name, lastname, email, password, speciality } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (adminUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can add managers' });
        }
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `The email ${email} already exists, try another email` });
        }

        const manager = new ManagerModel({ name, lastname, email, password, role: 'manager', speciality });
        manager.password = await bcrypt.hash(password, 10);
        await manager.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Account details',
            text: `Welcome to our platform. Your ${manager.role} account has been registered with email ${email} and password ${password} please reset your password`,
        }

        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: 'Manager added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const addTutor = async (req, res) => {
    try {
        const { name, lastname, email, password, classe } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
            return res.status(403).json({ success: false, message: 'Only admin can add tutors' });
        }
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `The email ${email} already exists, try another email` });
        }

        const tutor = new TutorModel({ name, lastname, email, password, role: 'tutor', classe });
        tutor.password = await bcrypt.hash(password, 10);
        await tutor.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Account details',
            text: `Welcome to our platform. Your ${tutor.role} account has been registered with email: ${email} and password: ${password} please reset your password`,
        }

        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: `Tutor added successfully by ${adminUser.role } ${adminUser.name}`});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const addStudent = async (req, res) => {
    try {
        const { name, lastname, email, password, speciality, skills, level } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (adminUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can add managers' });
        }
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `The email ${email} already exists, try another email` });
        }

        const student = new StudentModel({ name, lastname, email, password, role: 'student', speciality, skills, level });
        student.password = await bcrypt.hash(password, 10);
        await student.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Account details',
            text: `Welcome to our platform. Your ${adminUser.role} account has been registered with email: ${email} and password: ${password} please reset your password`,
        }

        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: 'Manager added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, { name: 1, lastname: 1, email: 1, role: 1 });
        res.status(200).json(users);
    } catch (error) {
        // console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

module.exports = {
    signup,
    sendVerifyOtp,
    verifyEmail,
    login,
    addManager,
    addTutor,
    addStudent,
    getAllUsers
};