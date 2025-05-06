const Joi = require('joi');
const jwt = require("jsonwebtoken");

const signupValidation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    lastname: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    // email: Joi.string()
    //     .email()
    //     .pattern(/^[a-zA-Z0-9._%+-]+@esprit\.tn$/)
    //     .required(),
    password: Joi.string().min(4).max(64).required(),
    // birthday: Joi.date().required(),
    role: Joi.string().valid('student').required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400)
      .json({ message: "Bad Request", error });
  }
  next();

}
const userToken = async (req, res, next) => {
  let token = req.cookies.token || req.headers.authorization?.split(" ")[1] || req.header("Authorization") ||
    req.headers['x-access-token'];

  if (!token) {
    console.log("No token provided");

    return res.status(401).json({ success: false, message: "Not authorized, login again" });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("token decode", tokenDecode);
    req.body.userId = tokenDecode.id;
    req.tokenDecode = tokenDecode;
    req.user = tokenDecode;
    next();
  } catch (err) {
    //console.error("Token verification error:", err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
const authMiddleware = (req, res, next) => {
  const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    //console.log("Extracted Token:", token);

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        //console.log("JWT Error:", err.message);
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


const isAdminMiddleware = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admin role required." });
};


const isManagerMiddleware = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Manager role required." });
};


const isTutorMiddleware = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'tutor') {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Tutor role required." });
};


const isStudentMiddleware = (req, res, next) => {
  if (['admin', 'manager', 'tutor', 'student'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Valid role required." });
};


const isManagerOrTutorMiddleware = (req, res, next) => {
  if (['admin', 'manager', 'tutor'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Manager or Tutor role required." });
};

const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can perform this action'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  signupValidation,
  userToken,
  authMiddleware,
  roleMiddleware,
  isAdmin,
  isAdminMiddleware,
  isManagerMiddleware,
  isTutorMiddleware,
  isStudentMiddleware,
  isManagerOrTutorMiddleware
}