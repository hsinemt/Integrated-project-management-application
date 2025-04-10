const express = require('express');
const router = express.Router();
const ProjectController = require('../Controllers/ProjectController');
const { validateProject } = require('../Middlewares/ProjectValidation');
const { userToken } = require('../Middlewares/UserValidation');
const { uploadProjectLogo } = require('../Config/ProjectUploadConfig');


router.post(
    '/create',
    userToken,
    uploadProjectLogo,
    validateProject,
    ProjectController.createProject
);

router.put(
    '/update/:id',
    userToken,
    uploadProjectLogo,
    validateProject,
    ProjectController.updateProject
);


router.get('/getAllProjects', ProjectController.getAllProjects);
router.get('/getProjectById/:id', ProjectController.getProjectById);
router.delete('/delete/:id', userToken, ProjectController.deleteProject);
router.get('/count', ProjectController.getProjectsCount);


module.exports = router;