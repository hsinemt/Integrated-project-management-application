const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ZipFile = require('../Models/ZipFile');
const Project = require('../Models/Project');
const User = require('../Models/User');
const CodeMark = require('../Models/CodeMark');
const zipProjectAnalyzer = require('../services/ZipProjectAnalyzer');

/**
 * Controller for handling zip project submissions and analysis
 */

/**
 * Upload a zip file without analysis
 * Can be associated with a specific task if taskId is provided
 */
exports.uploadZipFile = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const taskId = req.body.taskId; // Get taskId from request body

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Zip file is required'
            });
        }

        // Verify file is a zip
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        if (fileExt !== '.zip') {
            return res.status(400).json({
                success: false,
                message: 'Only zip files are allowed for project submissions'
            });
        }

        // Get project information
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get user information
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get file path
        const filePath = req.file.path;

        // Upload the zip file without analysis
        const result = await zipProjectAnalyzer.uploadZipFile(
            filePath,
            projectId,
            userId,
            req.file.originalname,
            taskId // Pass the taskId parameter
        );

        // Send response to client
        res.status(200).json({
            success: true,
            message: 'Zip file uploaded successfully',
            submissionInfo: {
                submissionId: result.submissionId,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                status: 'Uploaded'
            }
        });

    } catch (error) {
        console.error('Error uploading zip file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload zip file',
            error: error.message
        });
    }
};

/**
 * Analyze a previously uploaded zip file
 */
/**
 * Analyze a previously uploaded zip file
 */
/**
 * Analyze a previously uploaded zip file
 */
exports.analyzeZipFile = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.id;

        // Extract the userId from request body and ensure it's a string
        const analyzerUserId = req.body.userId
            ? String(req.body.userId)
            : String(userId);  // Fall back to authenticated user ID

        // Log for debugging
        console.log("analyzeZipFile called with userId from body:", analyzerUserId);
        console.log(`Original submissionId from request: "${submissionId}"`);

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Check if user is a tutor
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Only tutors can trigger analysis
        if (user.role !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'Only tutors can trigger analysis'
            });
        }

        // Send initial response to client to prevent timeout
        res.status(202).json({
            success: true,
            message: 'Analysis started. This may take some time.',
            submissionId: submissionId
        });

        // Analyze the zip file asynchronously
        try {
            console.log(`Starting analysis for submission ${submissionId}...`);

            // Improved matching strategy:
            // 1. Try exact match first
            let zipSubmission = await ZipFile.findOne({ submissionId: submissionId });

            // 2. If no exact match, try matching by MongoDB ObjectId
            if (!zipSubmission && mongoose.Types.ObjectId.isValid(submissionId)) {
                zipSubmission = await ZipFile.findById(submissionId);
            }

            // 3. If still no match, try a more flexible partial match
            if (!zipSubmission) {
                // Get all submissions - this is more expensive but will be a fallback
                const allSubmissions = await ZipFile.find().sort({ createdAt: -1 }).limit(50);

                // Find the closest match based on string similarity
                // First, try submissions that start with same pattern (first 6 chars)
                zipSubmission = allSubmissions.find(
                    sub => sub.submissionId.startsWith(submissionId.substring(0, 6))
                );

                // If still no match, check recently created submissions
                if (!zipSubmission && allSubmissions.length > 0) {
                    // Just use the most recent submission as a last resort
                    zipSubmission = allSubmissions[0];
                    console.log(`Using most recent submission as fallback: ${zipSubmission.submissionId}`);
                }
            }

            if (zipSubmission) {
                console.log(`Found matching submission with ID: ${zipSubmission.submissionId}`);

                // Use the zip project analyzer service with the correct ID AND userId
                await zipProjectAnalyzer.analyzeZipFile(zipSubmission.submissionId, analyzerUserId);
                console.log(`Analysis completed for submission ${zipSubmission.submissionId}`);
            } else {
                // No matching submission found
                console.error(`No matching submission found for ID: ${submissionId}`);
                throw new Error(`Zip submission with ID or similar to ${submissionId} not found`);
            }
        } catch (analysisError) {
            console.error(`Error during analysis of submission ${submissionId}:`, analysisError);
        }

    } catch (error) {
        console.error('Error analyzing zip file:', error);

        // If response has not been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to analyze zip file',
                error: error.message
            });
        }
    }
};
/**
 * Submit and analyze a zip file (legacy endpoint for backward compatibility)
 */
exports.submitZipProject = async (req, res) => {
    let zipSubmission = null;

    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Zip file is required'
            });
        }

        // Verify file is a zip
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        if (fileExt !== '.zip') {
            return res.status(400).json({
                success: false,
                message: 'Only zip files are allowed for project submissions'
            });
        }

        // Get project information
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get user information
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get file path
        const filePath = req.file.path;

        // Send initial response to client to prevent timeout
        res.status(202).json({
            success: true,
            message: 'Zip file submitted successfully. Analysis in progress.',
            submissionInfo: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                status: 'Processing'
            }
        });

        // Process the zip file asynchronously
        try {
            console.log(`Starting zip file processing for ${req.file.originalname}...`);

            // Use the zip project analyzer service
            const result = await zipProjectAnalyzer.processZipSubmission(
                filePath,
                projectId,
                userId,
                req.file.originalname
            );

            console.log(`Zip file processing completed for ${req.file.originalname}`);
            zipSubmission = result.zipSubmission;

        } catch (analysisError) {
            console.error('Error during zip file processing:', analysisError);

            // If we already have a submission record, update it with error status
            if (zipSubmission) {
                zipSubmission.status = 'Failed';
                zipSubmission.updatedAt = new Date();
                await zipSubmission.save();

                // Create a CodeMark record for the failed analysis
                const codeMark = new CodeMark({
                    project: projectId,
                    student: userId,
                    submissionId: zipSubmission.submissionId,
                    fileUrl: filePath,
                    fileName: req.file.originalname,
                    fileType: 'zip',
                    fileLanguage: 'zip',
                    status: 'Failed',
                    feedback: `Analysis failed: ${analysisError.message}`,
                    score: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await codeMark.save();
            }
        }

    } catch (error) {
        console.error('Error submitting zip project:', error);

        // If response has not been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to submit zip project for analysis',
                error: error.message
            });
        }
    }
};

/**
 * Get all zip project submissions for a specific project
 * Can be filtered by taskId if provided in query params
 */
exports.getProjectZipSubmissions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { taskId } = req.query; // Get taskId from query params

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Build query object
        const query = { project: projectId };

        // Add taskId to query if provided
        if (taskId) {
            query.taskId = taskId;
        }

        // Find zip submissions for the project, filtered by taskId if provided
        const submissions = await ZipFile.find(query)
            .populate('student', 'name lastname email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: submissions.length,
            submissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zip submissions',
            error: error.message
        });
    }
};

/**
 * Get zip submission details by ID
 */
exports.getZipSubmissionById = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Find the submission with populated references
        const submission = await ZipFile.findById(submissionId)
            .populate('student', 'name lastname email')
            .populate('project', 'title description')
            .populate({
                path: 'files.student',
                select: 'name lastname email'
            })
            .populate({
                path: 'files.task',
                select: 'name description priority état'
            })
            .populate({
                path: 'files.analysisResult',
                select: 'score detailedScores status feedback'
            });

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Find the corresponding analysis in CodeMark collection
        const analysis = await CodeMark.findOne({ 
            submissionId: submission.submissionId,
            fileType: 'zip'
        });

        res.status(200).json({
            success: true,
            submission: submission,
            analysis: analysis ? {
                score: analysis.score,
                detailedScores: analysis.detailedScores,
                analysisSource: analysis.analysisSource,
                feedback: analysis.feedback,
                status: analysis.status,
                sonarResults: analysis.sonarResults,
                sonarProjectKey: analysis.sonarProjectKey
            } : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission',
            error: error.message
        });
    }
};

/**
 * Get file details from a zip submission
 */
exports.getZipSubmissionFiles = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Find the submission
        const submission = await ZipFile.findById(submissionId);

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Get files with populated analysis results, student, and task information
        const submissionWithFiles = await ZipFile.findById(submissionId)
            .populate({
                path: 'files.analysisResult',
                select: 'score detailedScores status feedback'
            })
            .populate({
                path: 'files.student',
                select: 'name lastname email'
            })
            .populate({
                path: 'files.task',
                select: 'name description priority état'
            });

        res.status(200).json({
            success: true,
            submissionId: submission._id,
            zipFileName: submission.fileName,
            fileCount: submission.files.length,
            files: submissionWithFiles.files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission files',
            error: error.message
        });
    }
};

/**
 * Check zip submission status
 */
exports.checkZipSubmissionStatus = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Find the submission with more detailed information
        const submission = await ZipFile.findOne({
            $or: [
                { submissionId: submissionId },
                { _id: submissionId }
            ]
        }).populate('student', 'name lastname email');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Count files with student and task associations
        const filesWithStudents = submission.files.filter(file => file.student).length;
        const filesWithTasks = submission.files.filter(file => file.task).length;
        const analyzedFiles = submission.files.filter(file => file.analysisResult).length;

        // Find the corresponding analysis in CodeMark collection with detailed information
        const analysis = await CodeMark.findOne({
            submissionId: submission.submissionId,
            fileType: 'zip'
        }).select('+sonarResults'); // Include the sonarResults field which might be excluded by default

        // Prepare the response data
        const responseData = {
            success: true,
            submission: {
                id: submission._id,
                status: submission.status,
                submissionId: submission.submissionId,
                zipFileName: submission.fileName,
                fileCount: submission.files.length,
                filesWithStudents: filesWithStudents,
                filesWithTasks: filesWithTasks,
                analyzedFiles: analyzedFiles,
                createdAt: submission.createdAt,
                updatedAt: submission.updatedAt,
                // Analysis data from CodeMark
                analysis: analysis ? {
                    score: analysis.score,
                    detailedScores: analysis.detailedScores,
                    analysisSource: analysis.analysisSource,
                    feedback: analysis.feedback,
                    status: analysis.status,
                    sonarResults: analysis.sonarResults,  // Include raw sonar results
                    sonarProjectKey: analysis.sonarProjectKey
                } : null
            }
        };

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error checking submission status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check submission status',
            error: error.message
        });
    }
};

/**
 * Add tutor review to a zip submission
 */
exports.tutorReviewZipSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { score, feedback } = req.body;
        const tutorId = req.user.id;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        if (score === undefined || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'Score and feedback are required'
            });
        }

        // Find the submission
        const submission = await ZipFile.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Find the corresponding analysis in CodeMark collection
        const analysis = await CodeMark.findOne({ 
            submissionId: submission.submissionId,
            fileType: 'zip'
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found for this submission'
            });
        }

        // Update the CodeMark record with tutor review
        analysis.tutorReview = {
            reviewed: true,
            score: score,
            feedback: feedback,
            tutor: tutorId,
            reviewDate: new Date()
        };
        analysis.status = 'Reviewed';
        analysis.updatedAt = new Date();

        await analysis.save();

        // Update the submission status
        submission.status = 'Reviewed';
        submission.updatedAt = new Date();
        await submission.save();

        res.status(200).json({
            success: true,
            message: 'Submission reviewed successfully',
            submission,
            analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to review submission',
            error: error.message
        });
    }
};

/**
 * Download a zip file by submission ID
 */
exports.downloadZipFile = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Find the submission
        const submission = await ZipFile.findOne({ submissionId: submissionId });
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Get the file path from the extractedPath or fileUrl
        const filePath = submission.extractedPath || submission.fileUrl;

        // Check if the file exists on the server
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${submission.fileName}"`);

        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading zip file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download zip file',
            error: error.message
        });
    }
};

/**
 * Delete a zip file submission by ID
 */
exports.deleteZipFile = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.id;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

        // Find the submission
        const submission = await ZipFile.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Check if the user is authorized to delete this file
        // Only the student who uploaded the file or a tutor can delete it
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if the user is the owner of the file or a tutor
        if (submission.student.toString() !== userId && user.role !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this file'
            });
        }

        // Delete the physical file if it exists
        if (submission.fileUrl && fs.existsSync(submission.fileUrl)) {
            fs.unlinkSync(submission.fileUrl);
        }

        // Delete the extracted directory if it exists
        if (submission.extractedPath && fs.existsSync(submission.extractedPath)) {
            fs.rmSync(submission.extractedPath, { recursive: true, force: true });
        }

        // Delete any associated CodeMark records
        await CodeMark.deleteMany({ 
            submissionId: submission.submissionId,
            fileType: 'zip'
        });

        // Delete the submission record from the database
        await ZipFile.findByIdAndDelete(submissionId);

        res.status(200).json({
            success: true,
            message: 'Zip file deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting zip file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zip file',
            error: error.message
        });
    }
};
