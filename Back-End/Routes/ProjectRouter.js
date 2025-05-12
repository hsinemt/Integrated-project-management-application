const express = require('express');
const router = express.Router();
const ProjectController = require('../Controllers/ProjectController');
const CodeReviewController = require('../Controllers/CodeReviewController');
const { validateProject } = require('../Middlewares/ProjectValidation');
const { userToken, isAdminMiddleware, isManagerOrTutorMiddleware, isStudentMiddleware, authMiddleware } = require('../Middlewares/UserValidation');
const { uploadProjectAvatar } = require('../Config/ProjectUploadConfig');

router.post("/recommend-projects", ProjectController.recommend);
const { uploadCode } = require('../Config/CodeUploadConfig');


router.post(
    '/create',
    userToken,
    isManagerOrTutorMiddleware,
    uploadProjectAvatar,
    validateProject,
    ProjectController.createProject
);


router.put(
    '/update/:id',
    userToken,
    isManagerOrTutorMiddleware,
    uploadProjectAvatar,
    validateProject,
    ProjectController.updateProject
);


router.get('/getAllProjects', userToken, ProjectController.getAllProjects);
router.get('/getProjectById/:id', userToken, isStudentMiddleware, ProjectController.getProjectById);
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
router.get('/getProjectsByUserSpeciality', userToken, ProjectController.getProjectsByUserSpeciality);



module.exports = router;
