const { transporter } = require('../Config/nodemailer');
const bcrypt = require('bcrypt');
const UserModel = require("../Models/User");
const TutorModel = require("../Models/Tutor");
const ManagerModel = require("../Models/Manager");
const StudentModel= require("../Models/Student");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const User = require('../Models/User');
const axios = require('axios');
const GroupeModel = require('../Models/Group');
const ProjectModel = require('../Models/Project');
const TaskModel = require("../Models/tasks");


async function verifyRecaptcha(token) {
    const secretKey = '6Lf7r-EqAAAAANyNeRJnpAvdhHmcdWGYEo-vGuph';  // Clé secrète reCAPTCHA

    try {
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: secretKey,
                response: token
            }
        });

        return response.data.success;
    } catch (error) {
        console.error('Erreur de vérification reCAPTCHA:', error);
        return false;
    }
}   

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
const isUserEmailAvailable = async (req, res) => {
    try {
      const { email } = req.query;
  
      if (!email) {
        return res.status(400).json({ message: "L'email est requis" });
      }
  
      const user = await UserModel.findOne({ email });
  
      if (user) {
        // Assurez-vous que skills est un tableau et ne contient pas de valeurs undefined
        const skills = user.skills ? user.skills.map(skill => skill ? skill.toString().toLowerCase() : "").filter(skill => skill.trim()) : [];
        return res.status(200).json({ 
          available: true, 
          id: user._id, 
          skills: skills
        });
      } else {
        return res.status(200).json({ available: false });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
 
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Find the user by email
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé." });
        }

        // Check if the OTP matches and is not expired
        if (user.verifyOtp !== otp || user.verifyOtpExpirationAt < Date.now()) {
            return res.status(400).json({ message: "OTP invalide ou expiré." });
        }

        // Clear the OTP after successful verification
        user.verifyOtp = '';
        user.verifyOtpExpirationAt = 0;
        await user.save();

        res.status(200).json({ message: "OTP vérifié avec succès." });
    } catch (error) {
        console.error('Erreur dans la vérification OTP:', error);
        res.status(500).json({ message: "Erreur serveur." });
    } 
};



  const login = async (req, res) => {
    try {
      const { email, password, captchaToken, otp  } = req.body;
  
      // Vérification du reCAPTCHA
      const isCaptchaValid = await verifyRecaptcha(captchaToken);
      if (!isCaptchaValid) {
        return res.status(400).json({ message: "Échec de la validation reCAPTCHA" });
      }
  
      // Recherche de l'utilisateur dans la base de données
      const user = await UserModel.findOne({ email });
      if (!user) return res.status(400).json({ message: "Mauvais email" });
  
      // Vérification du mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });
  
      // Vérification de la 2FA si activée
      if (user.twoFactorAuth) {
        if (!otp) return res.status(400).json({ message: "Le code OTP est requis pour la 2FA" });
  
        // Verify the OTP
        if (user.verifyOtp !== otp || user.verifyOtpExpirationAt < Date.now()) {
          return res.status(400).json({ message: "OTP invalide ou expiré" });
        }
  
        // Clear the OTP after successful verification
        user.verifyOtp = '';
        user.verifyOtpExpirationAt = 0;
        await user.save();
      }
  
      // Création du token JWT
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "3h" }
      );
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none':'strict',
            maxAge: 3 * 60 * 60 * 1000
        });
  
      const redirectTo = "/index"; // Redirection vers la page après la connexion
  
      res.json({ 
        token, 
        role: user.role, 
        user: { id: user._id, email: user.email, role: user.role, avatar: user.avatar },
        redirectTo 
      });
  
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  };


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
    const { userId, otp } = req.body;
    if (!userId || !otp) {
        return res.json({ success: false, message: "Missing details" });
    }
    try {
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid Otp" });
        }
        if (user.verifyOtpExpirationAt < Date.now()) {
            return res.json({ success: false, message: "Otp Expired" });
        }
        user.isVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpirationAt = 0;
        await user.save();
        return res.json({ success: true, message: "Successfully verified" });
    } catch (err) {
        return res.json({ success: false, message: err.message });
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

        if (skills !== undefined && !Array.isArray(skills)) {
            return res.status(400).json({
                success: false,
                message: 'Skills must be an array of strings'
            });
        }

        if (adminUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admin can add students'
            });
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: `The email ${email} already exists, try another email`
            });
        }

        const student = new StudentModel({
            name,
            lastname,
            email,
            password,
            role: 'student',
            speciality,
            skills: skills || [],
            level
        });

        student.password = await bcrypt.hash(password, 10);
        await student.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Account details',
            text: `Welcome to our platform. Your student account has been registered with email: ${email} and password: ${password} please reset your password`,
        }

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            success: true,
            message: 'Student added successfully',
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                skills: student.skills
            }
        });
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

const getStudentProfile = async (req, res) => {
    try {
        const student = await UserModel.findById(req.user.id).select("-password");
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const group = await GroupeModel.findOne({ id_students: student._id });
        if (!group) {
            return res.status(200).json({ 
                student,
                message: "Student is not in any group yet"
            });
        }

        // Get the project ID from the group (singular id_project)
        const projectId = group.id_project;

        // Find tasks for this project and group
        const tasks = await TaskModel.find({
            project: projectId,
            group: group._id
        }).populate('assignedTo', 'name lastname');

        // Also get the project details if needed
        const project = await ProjectModel.findById(projectId);

        res.json({
            student,
            group: group || null,
            project: project || null,  // single project instead of array
            tasks: tasks || []
        });
    } catch (error) {
        console.error("Error in getStudentProfile:", error);
        res.status(500).json({ message: "Server error" });
    }
};
const updateStudentSkills = async (req, res) => {
    try {
        const { skills } = req.body;
        const userId = req.body.userId;

        if (skills && !Array.isArray(skills)) {
            return res.status(400).json({
                success: false,
                message: 'Skills must be an array of strings'
            });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Only students can update their skills'
            });
        }

        const updatedStudent = await StudentModel.findByIdAndUpdate(
            userId,
            { skills: skills || [] },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Skills updated successfully',
            student: {
                id: updatedStudent._id,
                name: updatedStudent.name,
                email: updatedStudent.email,
                skills: updatedStudent.skills
            }
        });
    } catch (err) {
        console.error("Error updating student skills:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
const getProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id).select("-password"); // Exclude password
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
const logout = (req, res) => {
    try {
        res.clearCookie("token"); // Suppression du token s'il est stocké en cookie
        res.setHeader("Authorization", ""); // Suppression du token des headers
        return res.status(200).json({ message: "Déconnexion réussie" });
    } catch (error) {
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

const sendVerifyOtp1 = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpirationAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
        await user.save();

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Code de vérification',
            text: `Votre code OTP est ${otp}. Valide pendant 10 minutes.`
    };

        await transporter.sendMail(mailOption);

        res.json({
            success: true,
            message: `Code OTP envoyé à ${user.email}`
    });
    } catch (err) {
        console.error("Erreur OTP:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
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
    getAllUsers,
    updateStudentSkills,
    getStudentProfile,
    getProfile,
    logout,
    isUserEmailAvailable,
    verifyOtp,
    sendVerifyOtp1

};