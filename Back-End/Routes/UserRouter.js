const express = require('express');
const { signup,sendVerifyOtp, verifyEmail} = require('../Controllers/UserController');

const {signupValidation,userToken} = require('../Middlewares/UserValidation')

const router = express.Router();

router.post('/signup', signupValidation, signup);
// router.post('/login',login);
router.post('/sendVerifyOtp',userToken,sendVerifyOtp);
router.post('/verifyAccount',userToken,verifyEmail);

module.exports = router;