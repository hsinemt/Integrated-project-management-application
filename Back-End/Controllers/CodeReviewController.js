const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const codeAnalysisService = require('../Services/RobustSonarCloudService');
const CodeMark = require('../Models/CodeMark');
const Project = require('../Models/Project');
const User = require('../Models/User');


exports.submitCode = async (req, res) => {
    let codeAssessment = null;

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
                message: 'Code file is required'
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

        const submissionId = new mongoose.Types.ObjectId().toString();

        const filePath = req.file.path;

        const fileExt = path.extname(req.file.originalname).toLowerCase();
        const fileType = getFileType(fileExt);




        codeAssessment = new CodeMark({
            project: projectId,
            student: userId,
            submissionId: submissionId,
            fileUrl: filePath,
            fileName: req.file.originalname,
            fileType: fileType,
            fileLanguage: getLanguage(fileExt),
            sonarResults: {},
            sonarProjectKey: `${userId}_${projectId}_${submissionId}`,
            score: 0,  // Will be updated after analysis
            feedback: '',
            status: 'Processing',
            analysisSource: 'unknown',
            tutorReview: {
                reviewed: false,
                score: null,
                feedback: ''
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });


        await codeAssessment.save();


        res.status(202).json({
            success: true,
            message: 'Code submitted successfully. Analysis in progress.',
            assessment: {
                id: codeAssessment._id,
                submissionId: submissionId,
                status: 'Processing'
            }
        });

        const timeoutId = setTimeout(async () => {
            try {
                const assessment = await CodeMark.findById(codeAssessment._id);
                if (assessment && assessment.status === 'Processing') {
                    console.log(`Analysis timeout for ${submissionId}, updating status to Failed`);
                    assessment.status = 'Failed';
                    assessment.feedback = 'Analysis timed out after 3 minutes';
                    assessment.updatedAt = new Date();
                    await assessment.save();
                }
            } catch (timeoutError) {
                console.error('Error handling analysis timeout:', timeoutError);
            }
        }, 180000); // 3 minutes

        // Now run the analysis asynchronously
        try {
            console.log(`Starting code analysis for submission ${submissionId}...`);
            const analysisResult = await codeAnalysisService.analyzeCode(
                filePath,
                submissionId,
                userId,
                projectId,
                req.file.originalname,
                false
            );

            // Determine status and feedback based on analysis source
            let statusMessage = 'Pending';
            let feedbackMessage = '';

            // Provide information about which analyzer was used
            if (analysisResult.analysisSource === 'sonarcloud') {
                feedbackMessage = 'Analysis completed using SonarCloud.';
                statusMessage = 'Pending';
            } else if (analysisResult.analysisSource === 'localAnalyzer') {
                feedbackMessage = 'Analysis completed using local analyzer. For more detailed results, contact your instructor.';
                statusMessage = 'Pending';
            } else if (analysisResult.analysisSource === 'defaultFallback') {
                feedbackMessage = 'Analysis based on file properties. Limited metrics available.';
                statusMessage = 'Pending';
            }

            await CodeMark.findByIdAndUpdate(
                codeAssessment._id,
                {
                    sonarResults: analysisResult.analysisResults,
                    sonarProjectKey: analysisResult.projectKey,
                    score: analysisResult.score,
                    detailedScores: analysisResult.detailedScores,
                    status: statusMessage,
                    feedback: feedbackMessage,
                    analysisSource: analysisResult.analysisSource,
                    updatedAt: new Date()
                },
                { new: true }
            );

            console.log(`Analysis completed for submission ${submissionId} with score ${analysisResult.score} using ${analysisResult.analysisSource}`);

        } catch (analysisError) {
            // Clear the timeout since analysis failed
            clearTimeout(timeoutId);

            console.error('Error during code analysis:', analysisError);

            // Provide more informative error message based on the type of error
            let errorMessage = '';
            let errorType = 'Analysis';

            if (analysisError.message.includes('SonarCloud')) {
                errorMessage = 'SonarCloud analysis failed. The system is currently unable to process your code.';
                errorType = 'SonarCloud';
            } else if (analysisError.message.includes('ZIP validation')) {
                errorMessage = `ZIP file error: ${analysisError.message}. Please ensure your ZIP file is not corrupted.`;
                errorType = 'ZIP';
            } else if (analysisError.message.includes('RAR validation')) {
                errorMessage = `RAR file error: ${analysisError.message}. Please ensure your RAR file is not corrupted.`;
                errorType = 'RAR';
            } else if (analysisError.message.includes('Archive extraction')) {
                errorMessage = `Archive extraction failed: ${analysisError.message}. Please try a different archive file.`;
                errorType = 'Archive';
            } else {
                errorMessage = `Analysis failed: ${analysisError.message}`;
            }

            // Update status to Failed if analysis fails
            await CodeMark.findByIdAndUpdate(
                codeAssessment._id,
                {
                    status: 'Failed',
                    feedback: errorMessage,
                    errorType: errorType, // Add error type for better UI handling
                    updatedAt: new Date()
                },
                { new: true }
            );
        }

    } catch (error) {
        console.error('Error submitting code:', error);

        // If we already created a record, update it with error status
        if (codeAssessment) {
            try {
                await CodeMark.findByIdAndUpdate(
                    codeAssessment._id,
                    {
                        status: 'Failed',
                        feedback: `Analysis failed: ${error.message}`,
                        updatedAt: new Date()
                    },
                    { new: true }
                );
            } catch (updateError) {
                console.error('Error updating assessment status:', updateError);
            }
        }

        // If response has not been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to submit code for analysis',
                error: error.message
            });
        }
    }
};


function getFileType(extension) {
    const webExtensions = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx'];
    const backendExtensions = ['.php', '.py', '.rb', '.java', '.c', '.cpp', '.cs', '.go'];
    const configExtensions = ['.json', '.xml', '.yml', '.yaml', '.toml', '.ini'];
    const dbExtensions = ['.sql'];
    const archiveExtensions = ['.zip', '.rar', '.tar', '.gz'];

    if (webExtensions.includes(extension)) return 'Web';
    if (backendExtensions.includes(extension)) return 'Backend';
    if (configExtensions.includes(extension)) return 'Configuration';
    if (dbExtensions.includes(extension)) return 'Database';
    if (archiveExtensions.includes(extension)) return 'Archive';

    return 'Unknown';
}


function getLanguage(extension) {
    const languageMap = {
        '.html': 'HTML',
        '.css': 'CSS',
        '.js': 'JavaScript',
        '.jsx': 'JavaScript (React)',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript (React)',
        '.php': 'PHP',
        '.py': 'Python',
        '.rb': 'Ruby',
        '.java': 'Java',
        '.c': 'C',
        '.cpp': 'C++',
        '.cs': 'C#',
        '.go': 'Go',
        '.json': 'JSON',
        '.xml': 'XML',
        '.yml': 'YAML',
        '.yaml': 'YAML',
        '.toml': 'TOML',
        '.ini': 'INI',
        '.sql': 'SQL',
        '.zip': 'Archive',
        '.rar': 'Archive',
        '.tar': 'Archive',
        '.gz': 'Archive'
    };

    return languageMap[extension] || 'Unknown';
}


exports.getProjectAssessments = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Find all assessments for the project
        const assessments = await CodeMark.find({ project: projectId })
            .populate('student', 'name lastname email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: assessments.length,
            assessments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessments',
            error: error.message
        });
    }
};


exports.tutorReview = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { score, feedback } = req.body;
        const tutorId = req.user.id;

        if (!assessmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }

        if (score === undefined || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'Score and feedback are required'
            });
        }

        // Find the assessment
        const assessment = await CodeMark.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'Assessment not found'
            });
        }

        // Update with tutor review
        assessment.tutorReview = {
            reviewed: true,
            score: score,
            feedback: feedback,
            tutor: tutorId,
            reviewDate: new Date()
        };

        assessment.status = 'Reviewed';
        assessment.updatedAt = new Date();

        await assessment.save();

        res.status(200).json({
            success: true,
            message: 'Assessment reviewed successfully',
            assessment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to review assessment',
            error: error.message
        });
    }
};


exports.getAssessmentById = async (req, res) => {
    try {
        const { assessmentId } = req.params;

        if (!assessmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }

        // Find the assessment
        const assessment = await CodeMark.findById(assessmentId)
            .populate('student', 'name lastname email')
            .populate('project', 'title description');

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'Assessment not found'
            });
        }

        res.status(200).json({
            success: true,
            assessment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessment',
            error: error.message
        });
    }
};


exports.checkAssessmentStatus = async (req, res) => {
    try {
        const { assessmentId } = req.params;

        if (!assessmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }

        // Find the assessment
        const assessment = await CodeMark.findById(assessmentId);

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'Assessment not found'
            });
        }

        res.status(200).json({
            success: true,
            assessment: {
                id: assessment._id,
                status: assessment.status,
                score: assessment.score,
                submissionId: assessment.submissionId,
                fileType: assessment.fileType,
                fileLanguage: assessment.fileLanguage,
                analysisSource: assessment.analysisSource
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check assessment status',
            error: error.message
        });
    }
};
