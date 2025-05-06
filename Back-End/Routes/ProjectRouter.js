const express = require('express');
const router = express.Router();
const ProjectController = require('../Controllers/ProjectController');
const CodeReviewController = require('../Controllers/CodeReviewController');
const { validateProject } = require('../Middlewares/ProjectValidation');
const { userToken, isAdminMiddleware, isManagerOrTutorMiddleware, isStudentMiddleware } = require('../Middlewares/UserValidation');
const { uploadProjectLogo } = require('../Config/ProjectUploadConfig');
const { uploadCode } = require('../Config/CodeUploadConfig');

// Project routes
router.post(
    '/create',
    userToken,
    isManagerOrTutorMiddleware,
    uploadProjectLogo,
    validateProject,
    ProjectController.createProject
);

router.put(
    '/update/:id',
    userToken,
    isManagerOrTutorMiddleware,
    uploadProjectLogo,
    validateProject,
    ProjectController.updateProject
);

router.get('/getAllProjects', userToken, ProjectController.getAllProjects);
router.get('/getProjectById/:id', userToken, isManagerOrTutorMiddleware, ProjectController.getProjectById);
router.delete('/delete/:id', userToken, isAdminMiddleware, ProjectController.deleteProject);
router.get('/count', userToken, ProjectController.getProjectsCount);
router.put('/assign-tutor/:id', userToken, isManagerOrTutorMiddleware, ProjectController.assignTutorToProject);

// Code assessment routes
router.post('/assess-code', userToken, isStudentMiddleware, uploadCode, CodeReviewController.submitCode);
router.post('/:projectId/assess-code', userToken, isStudentMiddleware, uploadCode, CodeReviewController.submitCode);
router.get('/:projectId/assessments', userToken, isManagerOrTutorMiddleware, CodeReviewController.getProjectAssessments);
router.put('/assessment/:assessmentId/review', userToken, isManagerOrTutorMiddleware, CodeReviewController.tutorReview);
router.get('/assessment/:assessmentId', userToken, CodeReviewController.getAssessmentById);
router.get('/assessment/:assessmentId/status', userToken, CodeReviewController.checkAssessmentStatus);

module.exports = router;