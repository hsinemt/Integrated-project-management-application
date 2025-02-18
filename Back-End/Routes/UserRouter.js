const express = require('express');
const { signup } = require('../Controllers/UserController');

const {signupValidation} = require('../Middlewares/UserValidation')
const router = express.Router();

router.post('/signup', signupValidation, signup);

module.exports = router;