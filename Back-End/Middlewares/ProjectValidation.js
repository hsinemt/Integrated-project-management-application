const Joi = require('joi');

const projectSchema = Joi.object({
    title: Joi.string().trim().min(1).max(100).required()
        .messages({
            'string.empty': 'Project title is required',
            'string.max': 'Title cannot exceed 100 characters',
            'any.required': 'Project title is required'
        }),

    description: Joi.string().trim().required()
        .messages({
            'string.empty': 'Project description is required',
            'any.required': 'Project description is required'
        }),

    keyFeatures: Joi.array().items(Joi.string().trim().min(1).required())
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one key feature is required',
            'string.empty': 'Features cannot be empty strings',
            'any.required': 'Key features are required'
        }),
    userId: Joi.string().required(),

    createdAt: Joi.date(),
    updatedAt: Joi.date()
});

exports.validateProject = (req, res, next) => {
    const { error } = projectSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessage
        });
    }

    next();
};