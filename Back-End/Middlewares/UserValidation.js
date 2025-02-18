const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization"); //  gooExtract token tansh tebdil hathi min aziz
    console.log("Extracted Token:", token);

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT Error:", err.message);
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }

        req.user = decoded; // Attach user data to request
        next();
    });
};

// ✅ Role-based access control middleware
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied: Insufficient permissions" });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    roleMiddleware
};
