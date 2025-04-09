const bcrypt = require("bcrypt");
const UserModel = require("../Models/user");
const jwt = require("jsonwebtoken");
const GroupeModel = require('../models/Group');
const Task = require('../Models/task');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "3h" }
        );

        // Define routes based on roles
        const roleRoutes = {
            admin: "/dashboard/admin",
            manager: "/dashboard/manager",
            tutor: "/dashboard/tutor",
            student: "/dashboard/student"
        };

        res.json({ 
            token, 
            role: user.role, 
            redirectTo: roleRoutes[user.role] || "/dashboard/default" 
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
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

const getStudentProfile = async (req, res) => {
    try {
        const student = await User.findById(req.user.id).select("-password");
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const group = await GroupeModel.findOne({ id_students: student._id }).populate('id_projects');
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const tasks = await Task.find({
            project: { $in: group.id_projects.map(project => project._id) },
            group: group._id
        }).populate('student', 'name lastname');

        res.json({
            student,
            group,
            projects: group.id_projects,
            tasks
        });
    } catch (error) {
        console.error("Error in getStudentProfile:", error);
        res.status(500).json({ message: "Server error" });
    }}



module.exports = {
    login,getProfile,getStudentProfile
};