const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Import the robust SonarCloud service
const codeAnalysisService = require('../Services/RobustSonarCloudService');
const CodeMark = require('../Models/CodeMark');
const Project = require('../Models/Project');
const User = require('../Models/User');
// For database file processing
const dbZipHandler = require('../Services/DatabaseZipHandler');
// New robust extractor for problematic ZIP files
const robustZipExtractor = require('../Services/RobustZipExtractor');
// Add fs-extra for better file operations
const fse = require('fs-extra');

/**
 * Controller for handling code assessments and reviews
 */
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

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Code file is required'
            });
        }

        // Validate file size for archives
        const isArchive = /\.(zip|rar|tar|gz)$/i.test(req.file.originalname);
        const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB limit for archives

        if (isArchive && req.file.size > MAX_ARCHIVE_SIZE) {
            return res.status(400).json({
                success: false,
                message: `Archive file is too large (${Math.round(req.file.size/1024/1024)}MB). Maximum size is 50MB.`
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

        // Generate a unique submission ID
        const submissionId = new mongoose.Types.ObjectId().toString();

        // Get file path
        const filePath = req.file.path;

        // Get file extension and type
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        const fileType = getFileType(fileExt);

        // Log file information for debugging
        console.log(`File uploaded successfully: ${req.file.filename}`);
        console.log(`File information: ${req.file.originalname} (${fileType}, ${fileExt})`);

        // Create initial assessment record before analysis
        // This helps avoid ECONNRESET by responding early
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

        // Save initial record
        await codeAssessment.save();

        // Send initial response to client to prevent timeout
        res.status(202).json({
            success: true,
            message: 'Code submitted successfully. Analysis in progress.',
            assessment: {
                id: codeAssessment._id,
                submissionId: submissionId,
                status: 'Processing'
            }
        });

        // Set a timeout to update status if analysis takes too long
        const timeoutId = setTimeout(async () => {
            try {
                const assessment = await CodeMark.findById(codeAssessment._id);
                if (assessment && assessment.status === 'Processing') {
                    console.log(`Analysis timeout for ${submissionId}, updating status to Failed`);
                    assessment.status = 'Failed';
                    assessment.feedback = 'Analysis timed out after 5 minutes';
                    assessment.updatedAt = new Date();
                    await assessment.save();
                }
            } catch (timeoutError) {
                console.error('Error handling analysis timeout:', timeoutError);
            }
        }, 300000); // 5 minutes (increased from 3)

        // Now run the analysis asynchronously
        try {
            console.log(`Starting code analysis for submission ${submissionId}...`);

            // Set useFallback to false for SonarCloud priority
            const useFallback = false;

            let analysisResult;

            // For ZIP files, use our robust extractor
            if (isArchive && fileExt.toLowerCase() === '.zip') {
                // Read the file content for ZIP processing
                const fileContent = await fs.promises.readFile(filePath);

                // Create extraction path
                const extractionPath = path.join(path.dirname(filePath), `${submissionId}-extracted`);

                console.log(`Using robust extractor for ZIP file ${req.file.originalname}`);

                try {
                    // Extract ZIP content with robust extractor that can handle problematic ZIPs
                    const extractedPath = await robustZipExtractor.extract(
                        fileContent,
                        extractionPath,
                        submissionId
                    );

                    // Verify the extracted path is valid
                    if (!extractedPath || typeof extractedPath !== 'string') {
                        throw new Error('Extraction produced an invalid path');
                    }

                    // Ensure the path exists before passing to SonarCloud
                    const pathExists = await fse.pathExists(extractedPath);
                    const isDir = pathExists ? (await fse.stat(extractedPath)).isDirectory() : false;

                    if (!pathExists || !isDir) {
                        throw new Error(`Extracted path doesn't exist or isn't a directory: ${extractedPath}`);
                    }

                    // Run analysis on extracted content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractedPath,
                        submissionId,
                        userId,
                        projectId,
                        req.file.originalname,
                        useFallback
                    );
                } catch (extractionError) {
                    console.error(`ZIP extraction failed with robust extractor:`, extractionError);

                    // Create fallback for completely failed extractions
                    await robustZipExtractor.createFolderWithContent(
                        null, // No input needed for fallback creation
                        extractionPath,
                        submissionId
                    );

                    // Run analysis on fallback content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractionPath, // Use the original extraction path
                        submissionId,
                        userId,
                        projectId,
                        req.file.originalname,
                        useFallback
                    );
                }
            } else if (isArchive && fileExt.toLowerCase() === '.rar') {
                // For RAR files - use standard extraction if available
                // Create extraction path
                const extractionPath = path.join(path.dirname(filePath), `${submissionId}-extracted`);

                try {
                    // Extract RAR content (this might fail if not supported)
                    const extractedPath = await codeAnalysisService.extractRarFile(
                        filePath,
                        extractionPath
                    );

                    // Run analysis on extracted content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractedPath,
                        submissionId,
                        userId,
                        projectId,
                        req.file.originalname,
                        useFallback
                    );
                } catch (extractionError) {
                    console.error(`RAR extraction failed:`, extractionError);

                    // Create fallback for completely failed extractions
                    await robustZipExtractor.createFolderWithContent(
                        null,
                        extractionPath,
                        submissionId
                    );

                    // Run analysis on fallback content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractionPath,
                        submissionId,
                        userId,
                        projectId,
                        req.file.originalname,
                        useFallback
                    );
                }
            } else {
                // For non-archive files, use standard analysis
                analysisResult = await codeAnalysisService.analyzeCode(
                    filePath,
                    submissionId,
                    userId,
                    projectId,
                    req.file.originalname,
                    useFallback
                );
            }

            // Determine status and feedback based on analysis source
            let statusMessage = 'Pending';
            let feedbackMessage = '';

            // Provide information about which analyzer was used
            if (analysisResult.analysisSource === 'sonarcloud') {
                feedbackMessage = 'Analysis completed using SonarCloud.';
                statusMessage = 'Pending';
            } else if (analysisResult.analysisSource === 'localAnalyzer') {
                feedbackMessage = 'Analysis completed using local analyzer. For more detailed results, contact your instructor.';
                statusMessage = 'Analyzed';
            } else if (analysisResult.analysisSource === 'defaultFallback') {
                feedbackMessage = 'Analysis based on file properties. Limited metrics available.';
                statusMessage = 'Limited';
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
            } else if (analysisError.message.includes('disk entries is too large')) {
                errorMessage = 'ZIP file contains too many files. Please submit a smaller archive or individual files.';
                errorType = 'ZIP';
            } else if (analysisError.message.includes('Archive too complex')) {
                errorMessage = 'Archive file is too complex or contains too many files. Please submit a smaller archive or individual files.';
                errorType = 'Archive';
            } else if (analysisError.message.includes('RAR validation')) {
                errorMessage = `RAR file error: ${analysisError.message}. Please ensure your RAR file is not corrupted.`;
                errorType = 'RAR';
            } else if (analysisError.message.includes('Archive extraction')) {
                errorMessage = `Archive extraction failed: ${analysisError.message}. Please try a different archive file.`;
                errorType = 'Archive';
            } else if (analysisError.message.includes('timeout')) {
                errorMessage = 'Analysis timed out. Your code may be too complex or the archive contains too many files.';
                errorType = 'Timeout';
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

/**
 * Submit code for analysis from database
 * This is a specialized version for analyzing code that's already in the database
 */
exports.submitCodeFromDatabase = async (req, res) => {
    let codeAssessment = null;

    try {
        const { projectId } = req.params;
        const { fileId } = req.body; // Expect file ID from the database
        const userId = req.user.id;

        if (!projectId || !fileId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID and File ID are required'
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

        // Get the code file from database
        // Assuming your model is named CodeFile, adjust if different
        const CodeFile = mongoose.model('CodeFile');
        const codeFile = await CodeFile.findById(fileId);

        if (!codeFile) {
            return res.status(404).json({
                success: false,
                message: 'Code file not found in database'
            });
        }

        // Generate a unique submission ID
        const submissionId = new mongoose.Types.ObjectId().toString();

        // Get file extension and type
        const fileName = codeFile.fileName || 'code-file.js';
        const fileExt = path.extname(fileName).toLowerCase();
        const fileType = getFileType(fileExt);

        // Log file information for debugging
        console.log(`Processing database file: ${fileName} (ID: ${fileId})`);

        // Create initial assessment record
        codeAssessment = new CodeMark({
            project: projectId,
            student: userId,
            submissionId: submissionId,
            fileUrl: `db://${fileId}`, // Special URL to indicate database source
            fileName: fileName,
            fileType: fileType,
            fileLanguage: getLanguage(fileExt),
            sonarResults: {},
            sonarProjectKey: `${userId}_${projectId}_${submissionId}`,
            score: 0,
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

        // Save initial record
        await codeAssessment.save();

        // Send initial response to prevent timeout
        res.status(202).json({
            success: true,
            message: 'Code submitted from database. Analysis in progress.',
            assessment: {
                id: codeAssessment._id,
                submissionId: submissionId,
                status: 'Processing'
            }
        });

        // Set a timeout for long-running analysis
        const timeoutId = setTimeout(async () => {
            try {
                const assessment = await CodeMark.findById(codeAssessment._id);
                if (assessment && assessment.status === 'Processing') {
                    assessment.status = 'Failed';
                    assessment.feedback = 'Analysis timed out after 5 minutes';
                    assessment.updatedAt = new Date();
                    await assessment.save();
                }
            } catch (timeoutError) {
                console.error('Error handling analysis timeout:', timeoutError);
            }
        }, 300000); // 5 minutes

        // Run the analysis asynchronously
        try {
            console.log(`Starting database code analysis for submission ${submissionId}...`);

            // Get file content from database
            const fileContent = codeFile.code; // Adjust field name if different

            let analysisResult;

            // For ZIP files, use our robust extractor
            if (fileExt.toLowerCase() === '.zip') {
                // Create extraction path
                const extractionPath = path.join(process.cwd(), 'uploads', 'code', `${submissionId}-extracted`);

                try {
                    // Use robust zip extractor
                    const extractedPath = await robustZipExtractor.extract(
                        fileContent,
                        extractionPath,
                        submissionId
                    );

                    // Verify the extracted path is valid
                    if (!extractedPath || typeof extractedPath !== 'string') {
                        throw new Error('Extraction produced an invalid path');
                    }

                    // Ensure the path exists before passing to SonarCloud
                    const pathExists = await fse.pathExists(extractedPath);
                    const isDir = pathExists ? (await fse.stat(extractedPath)).isDirectory() : false;

                    if (!pathExists || !isDir) {
                        throw new Error(`Extracted path doesn't exist or isn't a directory: ${extractedPath}`);
                    }

                    // Analyze the extracted content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractedPath,
                        submissionId,
                        userId,
                        projectId,
                        fileName,
                        false // No fallback
                    );
                } catch (extractionError) {
                    console.error(`ZIP extraction failed:`, extractionError);

                    // Create fallback files
                    await robustZipExtractor.createFolderWithContent(
                        null,
                        extractionPath,
                        submissionId
                    );

                    // Analyze fallback content
                    analysisResult = await codeAnalysisService.analyzeCode(
                        extractionPath,
                        submissionId,
                        userId,
                        projectId,
                        fileName,
                        false // No fallback
                    );
                }
            } else {
                // For non-ZIP files, create a temp file and analyze
                const tempDir = path.join(process.cwd(), 'temp');
                await fse.ensureDir(tempDir);

                const tempFilePath = path.join(tempDir, `${submissionId}-${fileName}`);

                // Write temp file
                await fse.writeFile(
                    tempFilePath,
                    Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'binary')
                );

                // Analyze the file
                analysisResult = await codeAnalysisService.analyzeCode(
                    tempFilePath,
                    submissionId,
                    userId,
                    projectId,
                    fileName,
                    false // No fallback
                );

                // Clean up temp file
                try {
                    await fse.remove(tempFilePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError);
                }
            }

            // Determine status and feedback
            let statusMessage = 'Pending';
            let feedbackMessage = '';

            if (analysisResult.analysisSource === 'sonarcloud') {
                feedbackMessage = 'Analysis completed using SonarCloud.';
                statusMessage = 'Pending';
            } else if (analysisResult.analysisSource === 'localAnalyzer') {
                feedbackMessage = 'Analysis completed using local analyzer.';
                statusMessage = 'Analyzed';
            } else if (analysisResult.analysisSource === 'defaultFallback') {
                feedbackMessage = 'Analysis based on file properties. Limited metrics available.';
                statusMessage = 'Limited';
            }

            // Update the assessment with results
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

            console.log(`Database file analysis completed with score ${analysisResult.score}`);

        } catch (analysisError) {
            // Clear the timeout
            clearTimeout(timeoutId);

            console.error('Error during database code analysis:', analysisError);

            // Update with error status
            await CodeMark.findByIdAndUpdate(
                codeAssessment._id,
                {
                    status: 'Failed',
                    feedback: `Analysis failed: ${analysisError.message}`,
                    updatedAt: new Date()
                },
                { new: true }
            );
        }

    } catch (error) {
        console.error('Error submitting code from database:', error);

        // Update assessment if created
        if (codeAssessment) {
            try {
                await CodeMark.findByIdAndUpdate(
                    codeAssessment._id,
                    {
                        status: 'Failed',
                        feedback: `Error processing request: ${error.message}`,
                        updatedAt: new Date()
                    },
                    { new: true }
                );
            } catch (updateError) {
                console.error('Error updating assessment:', updateError);
            }
        }

        // Send error response if needed
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to process database code',
                error: error.message
            });
        }
    }
};

/**
 * Helper function to determine file type from extension
 */
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

/**
 * Helper function to determine programming language from extension
 */
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

/**
 * Get all assessments for a specific project
 */
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

/**
 * Add tutor review to a code assessment
 */
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

/**
 * Get assessment details by ID
 */
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

/**
 * Check assessment status
 */
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