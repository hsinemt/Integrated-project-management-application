const express = require('express');
const router = express.Router();
const codeReviewController = require('../Controllers/CodeReviewController');
const { uploadCode } = require('../Config/CodeUploadConfig');
const auth = require('../Middlewares/UserValidation');
const { userToken } = require('../Middlewares/UserValidation');

// Submit code for analysis
router.post('/:projectId/analyze', userToken, uploadCode, codeReviewController.submitCode);
router.get('/:projectId/assessments', userToken, codeReviewController.getProjectAssessments);
router.get('/assessment/:assessmentId', userToken, codeReviewController.getAssessmentById);
router.get('/assessment/:assessmentId/status', userToken, codeReviewController.checkAssessmentStatus);
router.post('/assessment/:assessmentId/review', userToken, codeReviewController.tutorReview);


module.exports = router;