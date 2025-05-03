const express = require('express');
const router = express.Router();
const ProjectController = require('../Controllers/ProjectController');
const CodeAssessmentController = require('../Controllers/CodeReviewController');
const { validateProject } = require('../Middlewares/ProjectValidation');
const { userToken, isAdminMiddleware, isManagerOrTutorMiddleware, isStudentMiddleware, authMiddleware } = require('../Middlewares/UserValidation');
const { uploadProjectLogo } = require('../Config/ProjectUploadConfig');

router.post("/recommend-projects", ProjectController.recommend);


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

router.post('/assess-code', userToken, isStudentMiddleware, CodeAssessmentController.submitCode);
router.post('/:projectId/assess-code', userToken, isStudentMiddleware, CodeAssessmentController.submitCode);
router.get('/:projectId/assessments', userToken, isManagerOrTutorMiddleware, CodeAssessmentController.getProjectAssessments);
router.put('/assessment/:assessmentId/review', userToken, isManagerOrTutorMiddleware, CodeAssessmentController.tutorReview);
router.get('/my-speciality', userToken, ProjectController.getProjectsByUserSpeciality);


module.exports = router;
