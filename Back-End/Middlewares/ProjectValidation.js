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

    keywords: Joi.array().items(Joi.string().trim().min(1).required())
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one keyword is required',
            'string.empty': 'Keywords cannot be empty strings',
            'any.required': 'Keywords are required'
        }),
    userId: Joi.string().required(),

    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard', 'Very Hard').default('Medium'),
    status: Joi.string().valid('Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled').default('Not Started'),
    projectAvatar: Joi.string().allow('', null),
    speciality: Joi.string().valid('Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic').trim(),

    createdAt: Joi.date(),
    updatedAt: Joi.date()
});

exports.validateProject = (req, res, next) => {
    if (req.body.keywords && typeof req.body.keywords === 'string') {
        try {
            console.log('Parsing keywords string:', req.body.keywords);
            req.body.keywords = JSON.parse(req.body.keywords);
            console.log('Parsed keywords:', req.body.keywords);
        } catch (error) {
            console.error('Error parsing keywords string:', error);
            return res.status(400).json({
                success: false,
                message: 'Invalid keywords format',
                errors: 'Keywords must be a valid JSON array'
            });
        }
    }

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
