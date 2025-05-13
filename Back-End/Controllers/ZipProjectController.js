const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ZipFile = require('../Models/ZipFile');
const Project = require('../Models/Project');
const User = require('../Models/User');
const CodeMark = require('../Models/CodeMark');
const zipProjectAnalyzer = require('../Services/ZipProjectAnalyzer');


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


        const filePath = req.file.path;


        const result = await zipProjectAnalyzer.uploadZipFile(
            filePath,
            projectId,
            userId,
            req.file.originalname,
            taskId
        );

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


exports.analyzeZipFile = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.id;


        const analyzerUserId = req.body.userId
            ? String(req.body.userId)
            : String(userId);


        console.log("analyzeZipFile called with userId from body:", analyzerUserId);
        console.log(`Original submissionId from request: "${submissionId}"`);

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        if (user.role !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'Only tutors can trigger analysis'
            });
        }

        res.status(202).json({
            success: true,
            message: 'Analysis started. This may take some time.',
            submissionId: submissionId
        });


        try {
            console.log(`Starting analysis for submission ${submissionId}...`);

            let zipSubmission = await ZipFile.findOne({ submissionId: submissionId });

            if (!zipSubmission && mongoose.Types.ObjectId.isValid(submissionId)) {
                zipSubmission = await ZipFile.findById(submissionId);
            }

            if (!zipSubmission) {
                const allSubmissions = await ZipFile.find().sort({ createdAt: -1 }).limit(50);

                zipSubmission = allSubmissions.find(
                    sub => sub.submissionId.startsWith(submissionId.substring(0, 6))
                );


                if (!zipSubmission && allSubmissions.length > 0) {
                    zipSubmission = allSubmissions[0];
                    console.log(`Using most recent submission as fallback: ${zipSubmission.submissionId}`);
                }
            }

            if (zipSubmission) {
                console.log(`Found matching submission with ID: ${zipSubmission.submissionId}`);


                await zipProjectAnalyzer.analyzeZipFile(zipSubmission.submissionId, analyzerUserId);
                console.log(`Analysis completed for submission ${zipSubmission.submissionId}`);
            } else {

                console.error(`No matching submission found for ID: ${submissionId}`);
                throw new Error(`Zip submission with ID or similar to ${submissionId} not found`);
            }
        } catch (analysisError) {
            console.error(`Error during analysis of submission ${submissionId}:`, analysisError);
        }

    } catch (error) {
        console.error('Error analyzing zip file:', error);


        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to analyze zip file',
                error: error.message
            });
        }
    }
};

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


        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Zip file is required'
            });
        }

        const fileExt = path.extname(req.file.originalname).toLowerCase();
        if (fileExt !== '.zip') {
            return res.status(400).json({
                success: false,
                message: 'Only zip files are allowed for project submissions'
            });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const filePath = req.file.path;

        res.status(202).json({
            success: true,
            message: 'Zip file submitted successfully. Analysis in progress.',
            submissionInfo: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                status: 'Processing'
            }
        });


        try {
            console.log(`Starting zip file processing for ${req.file.originalname}...`);


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


            if (zipSubmission) {
                zipSubmission.status = 'Failed';
                zipSubmission.updatedAt = new Date();
                await zipSubmission.save();


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

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to submit zip project for analysis',
                error: error.message
            });
        }
    }
};


exports.getProjectZipSubmissions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { taskId } = req.query;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }


        const query = { project: projectId };


        if (taskId) {
            query.taskId = taskId;
        }


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


exports.getZipSubmissionById = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }

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


exports.checkZipSubmissionStatus = async (req, res) => {
    try {
        const { submissionId } = req.params;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'Submission ID is required'
            });
        }


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


        const analysis = await CodeMark.findOne({
            submissionId: submission.submissionId,
            fileType: 'zip'
        }).select('+sonarResults');

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


        const submission = await ZipFile.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

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

        const filePath = submission.extractedPath || submission.fileUrl;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${submission.fileName}"`);

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


        const submission = await ZipFile.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (submission.student.toString() !== userId && user.role !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this file'
            });
        }

        if (submission.fileUrl && fs.existsSync(submission.fileUrl)) {
            fs.unlinkSync(submission.fileUrl);
        }


        if (submission.extractedPath && fs.existsSync(submission.extractedPath)) {
            fs.rmSync(submission.extractedPath, { recursive: true, force: true });
        }


        await CodeMark.deleteMany({ 
            submissionId: submission.submissionId,
            fileType: 'zip'
        });


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
