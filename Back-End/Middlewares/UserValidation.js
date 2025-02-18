const Joi = require('joi');

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
module.exports = {
    signupValidation
}