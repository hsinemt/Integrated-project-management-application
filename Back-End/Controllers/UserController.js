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

        // Récupérer l'utilisateur
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Wrong Email" });

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Wrong password" });

        // Générer le token JWT avec le rôle inclus
        const token = jwt.sign(
            { id: user._id, role: user.role }, // Inclut le rôle dans le token
            process.env.JWT_SECRET,
            { expiresIn: "3h" }
        );

        // Redirection universelle vers /index
        const redirectTo = "/index";

        // Retourner la réponse avec le token et le rôle
        res.json({ 
            token, 
            role: user.role, // ✅ Le rôle est renvoyé ici
            redirectTo 
        });
    } catch (error) {
        console.error("Login error:", error);
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