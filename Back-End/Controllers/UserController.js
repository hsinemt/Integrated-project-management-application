const bcrypt = require("bcrypt");
const UserModel = require("../Models/User");
const jwt = require("jsonwebtoken");


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

module.exports = {
    login
};