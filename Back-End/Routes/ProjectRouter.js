const express = require('express');
const router = express.Router();
const ProjectController = require('../Controllers/ProjectController');
const { validateProject } = require('../Middlewares/ProjectValidation');
const {userToken} = require('../Middlewares/UserValidation');

router.post('/create',userToken, validateProject, ProjectController.createProject);
router.get('/getAllProjects', ProjectController.getAllProjects);
router.get('/getProjectById/:id', ProjectController.getProjectById);
router.put('/update/:id',userToken, validateProject, ProjectController.updateProject);
router.delete('/delete/:id',userToken, ProjectController.deleteProject);
router.get('/count', ProjectController.getProjectsCount);
// router.get('/test-auth', userToken, (req, res) => {
//     res.json({
//         message: 'Authentication is working',
//         userId: req.body.userId
//     });
// });

module.exports = router;