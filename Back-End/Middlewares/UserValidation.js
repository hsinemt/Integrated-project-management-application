const Joi = require('joi');
const jwt = require("jsonwebtoken");

const signupValidation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        lastname: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(4).max(64).required(),
        // birthday: Joi.date().required(),
        role: Joi.string().valid('admin', 'student', 'tutor', 'module manager').required()
    });
    const {error} = schema.validate(req.body);
    if (error) {
        return res.status(400)
        .json({message: "Bad Request", error});

    }
    next();

}
const userToken = async (req,res,next)=>{
    const {token} = req.cookies;
    if(!token){
        return res.json({success: false, message:"Not authorized, login again"});
    }
    try {
       const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
       if(tokenDecode.id){
           req.body.userId = tokenDecode.id;
       }else{
           return res.json({success: false, message:"invalid token"});
       }
       req.body.userId = tokenDecode.id;
       next();

    }catch(err){
        res.json({success: false, message: err.message});
    }
}
module.exports = {
    signupValidation,
    userToken
}