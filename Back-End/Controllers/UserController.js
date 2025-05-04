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
const fs = require("fs");
const path = require('path');
let faceDetectionEnabled = false;
let faceapi, Canvas, Image, ImageData, loadImage, createCanvas;

try {
    faceapi = require('face-api.js');
    const canvas = require('canvas');
    Canvas = canvas.Canvas;
    Image = canvas.Image;
    ImageData = canvas.ImageData;
    loadImage = canvas.loadImage;
    createCanvas = canvas.createCanvas;

    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    faceDetectionEnabled = true;
    console.log('✅ Face detection modules loaded successfully');
} catch (error) {
    console.error('⚠️ Face detection modules not available:', error.message);
    console.log('⚠️ Registration will proceed without face detection');
    faceDetectionEnabled = false;
}

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
        const { name, lastname, email, password, speciality, avatar } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }

        if (adminUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can add managers' });
        }
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `The email ${email} already exists, try another email` });
        }

        const manager = new ManagerModel({ name, lastname, email, password, role: 'manager', speciality, avatar });
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
        const { name, lastname, email, password, classe, avatar } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }

        if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
            return res.status(403).json({ success: false, message: 'Only admin can add tutors' });
        }
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `The email ${email} already exists, try another email` });
        }

        const tutor = new TutorModel({ name, lastname, email, password, role: 'tutor', classe, avatar });
        tutor.password = await bcrypt.hash(password, 10);
        await tutor.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Account details',
            text: `Welcome to our platform. Your ${tutor.role} account has been registered with email: ${email} and password: ${password} please reset your password`,
        }

        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: 'Tutor added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const addStudent = async (req, res) => {
    try {
        const { name, lastname, email, password, speciality, skills, level, avatar } = req.body;
        const adminUser = await UserModel.findById(req.body.userId);

        if (skills !== undefined && !Array.isArray(skills)) {
            return res.status(400).json({
                success: false,
                message: 'Skills must be an array of strings'
            });
        }

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
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
            level,
            avatar
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

        // Debug logs
        console.log("Group project reference:", group.id_project);
        console.log("Group ID:", group._id);

        // Verify project exists
        const project = await ProjectModel.findById(group.id_project);
        console.log("Project found:", project ? project._id : null);

        // Check task count
        const taskCount = await TaskModel.countDocuments({
            project: group.id_project,
            group: group._id
        });
        console.log("Task count:", taskCount);

        // Find tasks
        const tasks = await TaskModel.find({
            project: group.id_project,
            group: group._id
        }).populate('assignedTo', 'name lastname');

        res.json({
            student,
            group: group || null,
            project: project || null,
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

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        const newRole = updates.role;

        console.log('Update request received:', { userId, updates });

        // Prevent changing role to admin
        if (newRole === 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Changing role to admin is not allowed' 
            });
        }

        // Find the current user
        const oldUser = await User.findById(userId);
        if (!oldUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // If password is being updated, hash it
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        } else {
            updates.password = oldUser.password;
        }

        // Check if the role is changing
        if (newRole && newRole !== oldUser.role) {
            // We need to delete and recreate with new role
            console.log(`Changing role from ${oldUser.role} to ${newRole}`);

            // Create a user data object with all fields
            const userData = {
                _id: oldUser._id,
                name: updates.name || oldUser.name,
                lastname: updates.lastname || oldUser.lastname,
                email: updates.email || oldUser.email,
                password: updates.password,
                isVerified: oldUser.isVerified,
                verifyOtp: oldUser.verifyOtp,
                verifyOtpExpirationAt: oldUser.verifyOtpExpirationAt,
                resetOtp: oldUser.resetOtp,
                resetOtpExpirationAt: oldUser.resetOtpExpirationAt,
                avatar: oldUser.avatar,
                images: oldUser.images,
                birthday: updates.birthday || oldUser.birthday,
                role: newRole
            };

            // Add role-specific fields based on new role
            if (newRole === 'student') {
                userData.speciality = updates.speciality || 'Twin'; // Default value
                userData.skills = updates.skills || [];
                userData.level = updates.level || '';
            } else if (newRole === 'manager') {
                userData.speciality = updates.speciality || 'Twin'; // Default value
            } else if (newRole === 'tutor') {
                userData.classe = updates.classe || '';
            }

            // Delete old user
            await User.findByIdAndDelete(userId);

            // Create new user with appropriate model
            let newUserModel;
            if (newRole === 'student') {
                newUserModel = require('../Models/Student');
            } else if (newRole === 'manager') {
                newUserModel = require('../Models/Manager');
            } else if (newRole === 'tutor') {
                newUserModel = require('../Models/Tutor');
            } else {
                newUserModel = User;
            }

            const newUser = new newUserModel(userData);
            await newUser.save();

            const updatedUser = await User.findById(userId).select('-password');

            return res.status(200).json({
                success: true,
                data: updatedUser,
                message: `User updated successfully with role change from ${oldUser.role} to ${newRole}`
            });
        } else {
            // No role change, perform normal update
            // Only update fields that are not the discriminator key
            delete updates.role; // Remove role from updates to avoid errors

            // Update user properties manually
            Object.keys(updates).forEach(key => {
                oldUser[key] = updates[key];
            });

            // Save the updated user
            await oldUser.save();

            // Get the updated user without password
            const updatedUser = await User.findById(userId).select('-password');
            console.log('Updated user data:', updatedUser);

            return res.status(200).json({
                success: true,
                data: updatedUser,
                message: 'User updated successfully'
            });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
  const deleteUser = async (req, res) => {
    try {
      const userId = req.params.id;

      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
  function isSupportedImageType(imageData) {
    const base64Regex = /data:image\/(jpeg|png);base64,/;
    const match = imageData.match(base64Regex);

    if (!match) {
        console.error('❌ Format d\'image non valide');
        return false;
    }

    const fileType = match[1];
    console.log("📂 Type d'image détecté :", fileType);
    return ['jpeg', 'png'].includes(fileType);
}

async function extractFaceDescriptor(imageData) {
    // If face detection is disabled, return null (registration will continue without it)
    if (!faceDetectionEnabled) {
        console.log('⚠️ Face detection bypassed - returning null descriptor');
        return null;
    }

    try {
        console.log("🔍 Vérification du format de l'image...");
        if (!isSupportedImageType(imageData)) {
            console.log("⚠️ Format d'image non supporté - skipping face detection");
            return null;
        }

        console.log("📤 Conversion de l'image en buffer...");
        const buffer = Buffer.from(imageData.split(',')[1], 'base64');
        const tempImagePath = path.join(process.cwd(), 'temp', `temp_${Date.now()}.jpg`);

        // Ensure temp directory exists
        fs.mkdirSync(path.dirname(tempImagePath), { recursive: true });
        fs.writeFileSync(tempImagePath, buffer);
        console.log("📸 Image enregistrée temporairement:", tempImagePath);

        console.log("📥 Chargement de l'image avec canvas...");
        const img = await loadImage(tempImagePath);
        console.log("✅ Image chargée dans canvas :", img.width, "x", img.height);

        const c = createCanvas(img.width, img.height);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        //console.log("🎨 Image dessinée sur le canvas");

        //console.log("🤖 Détection du visage...");
        const detections = await faceapi
            .detectAllFaces(c)
            .withFaceLandmarks()
            .withFaceDescriptors();

        // Clean up temp file
        try {
            fs.unlinkSync(tempImagePath);
        } catch (e) {
            console.error("Error removing temp file:", e);
        }

        console.log("📸 Nombre de visages détectés :", detections.length);
        if (detections.length === 0) {
            //console.log("⚠️ Aucun visage détecté!");
            return null;
        }

        console.log("✅ Visage détecté :", detections[0].descriptor.length, "dimensions");
        return Array.from(detections[0].descriptor);
    } catch (error) {
        console.error("🚨 Erreur lors de l'extraction du descripteur facial :", error);
        return null; // Return null instead of throwing to allow registration to continue
    }
}
const updateSdent = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const avatar = `/uploads/${req.file.filename}`;
        console.log("Avatar URL:", avatar);
        console.log("Authenticated User ID:", req.user.id);

        // First verify the user exists
        const userExists = await User.findById(req.user.id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        // Initialize face descriptor as null
        let faceDescriptor = null;

        // Process face detection for the uploaded avatar
        try {
            const imageBuffer = fs.readFileSync(path.join(process.cwd(), avatar.startsWith('/') ? avatar.substring(1) : avatar));
            const imageData = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
            //console.log("📷 Image converted to Base64 :", imageData.substring(0, 50) + "...");

            // Extract face descriptor
            faceDescriptor = await extractFaceDescriptor(imageData);

            if (faceDescriptor) {
                //console.log("✅ Face descriptor extracted successfully:", faceDescriptor.length, "dimensions");
            } else {
                //console.log("⚠️ No face detected or face detection skipped - proceeding without facial recognition");
            }
        } catch (imageError) {
            console.error("⚠️ Error processing image for face descriptor:", imageError);
            // Continue with update even if face detection fails
        }

        // Prepare update data
        const updateData = { avatar };
        if (faceDescriptor) {
            updateData.faceDescriptor = faceDescriptor;
            console.log("Adding face descriptor to update data");
        }

        // Update with explicit $set and proper error handling
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password'); // Exclude sensitive data

        console.log("Updated user document:", updatedUser);

        if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
        }

        return res.json({
            success: true,
            message: "Avatar uploaded and user updated successfully",
            avatar,
            user: updatedUser
        });

    } catch (error) {
        console.error("Full upload error:", error);
        return res.status(500).json({
            message: "Error in avatar upload process",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    sendVerifyOtp1,
    updateUser,
    deleteUser,
    updateSdent

};
