const express = require('express');
const { signup,sendVerifyOtp, verifyEmail, login, addManager, addTutor,addStudent, getAllUsers} = require('../Controllers/UserController');
// const ProjectController = require('../Controllers/ProjectController');
// const { validateKeywords } = require('../Middlewares/ProjectValidation'); // Create this middleware

const {signupValidation,userToken} = require('../Middlewares/UserValidation')

const router = express.Router();

router.post('/signup', signupValidation, signup);
router.post('/login',login);
router.post('/sendVerifyOtp',userToken,sendVerifyOtp);
router.post('/verifyAccount',userToken,verifyEmail);
router.post('/addManager', userToken, addManager);
router.post('/addTutor', userToken, addTutor);
router.post('/addStudent', userToken, addStudent);
router.get('/getUsers', getAllUsers);
// router.post('/generate', validateKeywords, ProjectController.generateITSubject.bind(ProjectController));
// router.post('/generate-and-create', validateKeywords, ProjectController.createProjectFromGenerated.bind(ProjectController));
module.exports = router;