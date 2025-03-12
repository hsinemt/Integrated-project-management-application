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
    const {error} = schema.validate(req.body);
    if (error) {
        return res.status(400)
        .json({message: "Bad Request", error});
    }
    next();

}
const userToken = async (req, res, next) => {
    let token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, login again" });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        //console.log("token decode", tokenDecode);
        req.body.userId = tokenDecode.id;
        next();
    } catch (err) {
        console.error("Token verification error:", err);
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};
module.exports = {
    signupValidation,
    userToken
}