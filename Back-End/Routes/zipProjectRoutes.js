const express = require('express');
const router = express.Router();
const zipProjectController = require('../Controllers/ZipProjectController');
const { uploadCode } = require('../Config/CodeUploadConfig');
const { userToken } = require('../Middlewares/UserValidation');

// Upload zip file without analysis (new endpoint)
router.post('/:projectId/upload-zip', userToken, uploadCode, zipProjectController.uploadZipFile);

// Analyze a previously uploaded zip file (new endpoint)
router.post('/zip-submission/:submissionId/analyze', userToken, zipProjectController.analyzeZipFile);

// Submit zip project for analysis (legacy endpoint for backward compatibility)
router.post('/:projectId/analyze-zip', userToken, uploadCode, zipProjectController.submitZipProject);

// Get all zip submissions for a project
router.get('/:projectId/zip-submissions', userToken, zipProjectController.getProjectZipSubmissions);

// Get details of a specific zip submission
router.get('/zip-submission/:submissionId', userToken, zipProjectController.getZipSubmissionById);

// Get file details from a zip submission
router.get('/zip-submission/:submissionId/files', userToken, zipProjectController.getZipSubmissionFiles);

// Check status of a zip submission
router.get('/zip-submission/:submissionId/status', userToken, zipProjectController.checkZipSubmissionStatus);

// Add tutor review to a zip submission
router.post('/zip-submission/:submissionId/review', userToken, zipProjectController.tutorReviewZipSubmission);

// Download a zip file by submission ID
router.get('/download/:submissionId', zipProjectController.downloadZipFile);

// Delete a zip file submission
router.delete('/zip-submission/:submissionId', userToken, zipProjectController.deleteZipFile);


module.exports = router;
