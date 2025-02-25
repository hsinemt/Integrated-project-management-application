const bcrypt = require("bcrypt");
const UserModel = require("../Models/User");
const jwt = require("jsonwebtoken");
const axios = require('axios')

async function verifyRecaptcha(token) {
    const secretKey = '6Lf7r-EqAAAAANyNeRJnpAvdhHmcdWGYEo-vGuph';  // Ta clé secrète

    try {
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: secretKey,
                response: token
            }
        });

        return response.data.success; // Retourner true ou false en fonction du résultat
    } catch (error) {
        console.error('Erreur lors de la vérification reCAPTCHA:', error);
        return false; // Retourner false en cas d'erreur
    }
}

const login = async (req, res) => {
    try {
        const { email, password, captchaToken } = req.body;

        // Vérifier le reCAPTCHA
        const isCaptchaValid = await verifyRecaptcha(captchaToken);
        if (!isCaptchaValid) {
            return res.status(400).json({ message: "reCAPTCHA validation failed" });
        }

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Wrong Email" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Wrong password" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "3h" }
        );

        // Définir les routes basées sur les rôles
        const roleRoutes = {
            admin: "/dashboard/admin",
            manager: "/dashboard/manager",
            tutor: "/dashboard/tutor",
            student: "/dashboard/student"
        };

        // Modifier la redirection pour tout le monde vers /index
        const redirectTo = "/index"; // Tous les utilisateurs seront redirigés vers /index

        res.json({ 
            token, 
            role: user.role, 
            redirectTo 
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};



const logout = (req, res) => {
    try {
        res.clearCookie("token"); // Si le token est stocké en cookie
        res.setHeader("Authorization", ""); // Supprimer le token des headers
        return res.status(200).json({ message: "Déconnexion réussie" });
    } catch (error) {
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

module.exports = {
    login,
    logout,
};