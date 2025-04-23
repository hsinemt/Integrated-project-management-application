const express = require('express');
const router = express.Router();
const CodeReviewController = require('../Controllers/CodeReviewController');
const { userToken, isManagerOrTutorMiddleware, isStudentMiddleware } = require('../Middlewares/UserValidation');


router.post(
    '/submit',
    userToken,
    isStudentMiddleware,
    CodeReviewController.submitCode
);

router.get(
    '/:assessmentId',
    userToken,
    CodeReviewController.getAssessment
);

router.put(
    '/:assessmentId/review',
    userToken,
    isManagerOrTutorMiddleware,
    CodeReviewController.tutorReview
);

router.get(
    '/project/:projectId',
    userToken,
    isManagerOrTutorMiddleware,
    CodeReviewController.getProjectAssessments
);

router.get(
    '/student/:studentId',
    userToken,
    CodeReviewController.getStudentAssessments
);

module.exports = router;