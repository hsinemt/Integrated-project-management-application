const Joi = require('joi');
const jwt = require("jsonwebtoken");


const authMiddleware = (req, res, next) => {
    const verifyToken = (req, res, next) => {
      const token = req.header("Authorization");
      console.log("Extracted Token:", token);
    
      if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
      }
    
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log("JWT Error:", err.message);
          return res.status(401).json({ message: "Token is not valid" });
        }
        req.user = decoded;
        next();
      });
    };
    verifyToken(req, res, next);  
  };
  const roleMiddleware = (roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    };
  };  
module.exports = {
    authMiddleware,
    roleMiddleware
}