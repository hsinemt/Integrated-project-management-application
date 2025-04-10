const rateLimit = require('express-rate-limit');

const aiGenerationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again after 15 minutes',

    }
});

module.exports = {
    aiGenerationLimiter
};