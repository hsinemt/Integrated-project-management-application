const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const fse = require('fs-extra');
const mongoose = require('mongoose');

// Import models and services
const ZipFile = require('../Models/ZipFile');
const CodeMark = require('../Models/CodeMark');
const sonarCloudService = require('./RobustSonarCloudService');

/**
 * Service for analyzing zip project submissions
 */
class ZipProjectAnalyzer {
    /**
     * Upload a zip file without analysis
     * @param {string} zipFilePath - Path to the uploaded zip file
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     * @param {string} originalFilename - Original filename of the zip
     * @param {string} taskId - Task ID (optional)
     * @returns {Object} Submission details
     */
    async uploadZipFile(zipFilePath, projectId, userId, originalFilename, taskId = null) {
        // Generate a unique submission ID
        const submissionId = new mongoose.Types.ObjectId().toString();

        // Create extraction path
        const extractionPath = path.join(path.dirname(zipFilePath), `${submissionId}-extracted`);

        let zipSubmission = null;

        try {
            console.log(`[${submissionId}] Starting zip file processing...`);

            // Extract the zip file
            await this.extractZipFile(zipFilePath, extractionPath);
            console.log(`[${submissionId}] Zip extraction complete`);

            // Scan the extracted directory to get file information
            // Pass projectId to allow task and student association
            const fileInfoList = await this.scanDirectory(extractionPath, '', projectId);
            console.log(`[${submissionId}] Found ${fileInfoList.length} files in zip`);

            // Create initial zip submission record
            zipSubmission = new ZipFile({
                project: projectId,
                student: userId,
                taskId: taskId, // Include taskId if provided
                submissionId: submissionId,
                // Use a proper URL that points to an API endpoint that can serve the file
                fileUrl: `/api/zip-project/download/${submissionId}`,
                fileName: originalFilename,
                extractedPath: extractionPath,
                files: fileInfoList,
                status: 'Uploaded', // Set status to 'Uploaded' instead of 'Processing'
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save initial record
            await zipSubmission.save();
            console.log(`[${submissionId}] Zip submission record created`);

            return {
                success: true,
                submissionId: submissionId,
                message: 'Zip file uploaded successfully',
                zipSubmission: zipSubmission
            };
        } catch (error) {
            console.error(`[${submissionId}] Error uploading zip file:`, error);

            // Update status if record was created
            if (zipSubmission) {
                zipSubmission.status = 'Failed';
                zipSubmission.updatedAt = new Date();
                await zipSubmission.save();
            }

            throw error;
        }
    }


    async analyzeZipFile(submissionId, providedUserId = null) {
        try {
            // Find the zip submission
            const zipSubmission = await ZipFile.findOne({ submissionId: submissionId });

            if (!zipSubmission) {
                throw new Error(`Zip submission with ID ${submissionId} not found`);
            }

            // Update status to Processing
            zipSubmission.status = 'Processing';
            zipSubmission.updatedAt = new Date();
            await zipSubmission.save();

            // Use the provided userId if available, otherwise use the submission's student
            // ENSURE it's a string either way
            const userIdForAnalysis = providedUserId
                ? String(providedUserId)
                : String(zipSubmission.student);

            console.log(`[${submissionId}] Using userId for analysis: ${userIdForAnalysis}`);

            console.log(`[${submissionId}] Starting SonarCloud analysis for the entire project...`);
            const analysisResult = await sonarCloudService.analyzeCode(
                zipSubmission.extractedPath,
                submissionId,
                userIdForAnalysis,
                String(zipSubmission.project), // Convert project ID to string
                zipSubmission.fileName,
                false // Enable fallback if SonarCloud fails
            );

            // Create a CodeMark record for the analysis results
            const codeMark = new CodeMark({
                project: zipSubmission.project,
                student: zipSubmission.student,
                submissionId: submissionId,
                fileUrl: zipSubmission.fileUrl,
                fileName: zipSubmission.fileName,
                fileType: 'zip',
                fileLanguage: 'zip',
                sonarResults: analysisResult.analysisResults,
                sonarProjectKey: analysisResult.projectKey,
                score: analysisResult.score,
                detailedScores: analysisResult.detailedScores, // This should now include rawMetrics
                status: 'Pending',
                feedback: this.generateFeedback(analysisResult),
                analysisSource: analysisResult.analysisSource,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await codeMark.save();

            // Update the zip submission with a reference to the analysis
            zipSubmission.status = 'Pending';
            zipSubmission.updatedAt = new Date();

            await zipSubmission.save();
            console.log(`[${submissionId}] Zip submission updated with analysis results`);

            // Optionally analyze individual files if needed
            if (zipSubmission.files.length > 0 && zipSubmission.files.length <= 20) { // Limit to 20 files to avoid overload
                await this.analyzeIndividualFiles(zipSubmission, zipSubmission.files, String(zipSubmission.project), userIdForAnalysis);
            }

            return {
                success: true,
                submissionId: submissionId,
                message: 'Zip file analyzed successfully',
                zipSubmission: zipSubmission,
                analysis: {
                    score: analysisResult.score,
                    detailedScores: analysisResult.detailedScores, // This should now include rawMetrics
                    analysisSource: analysisResult.analysisSource
                }
            };
        } catch (error) {
            console.error(`[${submissionId}] Error analyzing zip submission:`, error);

            // Find the zip submission
            const zipSubmission = await ZipFile.findOne({
                $or: [
                    { submissionId: submissionId },
                    { _id: submissionId }
                ]
            });

            if (zipSubmission) {
                zipSubmission.status = 'Failed';
                zipSubmission.updatedAt = new Date();
                await zipSubmission.save();

                // Create a CodeMark record for the failed analysis
                const codeMark = new CodeMark({
                    project: zipSubmission.project,
                    student: zipSubmission.student,
                    submissionId: submissionId,
                    fileUrl: zipSubmission.fileUrl,
                    fileName: zipSubmission.fileName,
                    fileType: 'zip',
                    fileLanguage: 'zip',
                    status: 'Failed',
                    feedback: `Analysis failed: ${error.message}`,
                    score: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await codeMark.save();
            }

            throw error;
        }
    }

    async processZipSubmission(zipFilePath, projectId, userId, originalFilename) {
        // Generate a unique submission ID
        const submissionId = new mongoose.Types.ObjectId().toString();

        // Create extraction path
        const extractionPath = path.join(path.dirname(zipFilePath), `${submissionId}-extracted`);

        let zipSubmission = null;

        try {
            console.log(`[${submissionId}] Starting zip file processing...`);

            // Extract the zip file
            await this.extractZipFile(zipFilePath, extractionPath);
            console.log(`[${submissionId}] Zip extraction complete`);

            // Scan the extracted directory to get file information
            // Pass projectId to allow task and student association
            const fileInfoList = await this.scanDirectory(extractionPath, '', projectId);
            console.log(`[${submissionId}] Found ${fileInfoList.length} files in zip`);

            // Create initial zip submission record
            zipSubmission = new ZipFile({
                project: projectId,
                student: userId,
                submissionId: submissionId,
                fileUrl: zipFilePath,
                fileName: originalFilename,
                extractedPath: extractionPath,
                files: fileInfoList,
                status: 'Processing',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save initial record
            await zipSubmission.save();
            console.log(`[${submissionId}] Initial zip submission record created`);

            // Analyze the project with SonarCloud
            console.log(`[${submissionId}] Starting SonarCloud analysis for the entire project...`);
            const analysisResult = await sonarCloudService.analyzeCode(
                extractionPath,
                submissionId,
                String(userId), // Ensure userId is a string
                String(projectId), // Ensure projectId is a string
                originalFilename,
                false // Enable fallback if SonarCloud fails
            );

            // Create a CodeMark record for the analysis results
            const codeMark = new CodeMark({
                project: projectId,
                student: userId,
                submissionId: submissionId,
                fileUrl: zipFilePath,
                fileName: originalFilename,
                fileType: 'zip',
                fileLanguage: 'zip',
                sonarResults: analysisResult.analysisResults,
                sonarProjectKey: analysisResult.projectKey,
                score: analysisResult.score,
                detailedScores: analysisResult.detailedScores,
                status: 'Pending',
                feedback: this.generateFeedback(analysisResult),
                analysisSource: analysisResult.analysisSource,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await codeMark.save();

            // Update the zip submission with a reference to the analysis
            zipSubmission.status = 'Pending';
            zipSubmission.updatedAt = new Date();

            await zipSubmission.save();
            console.log(`[${submissionId}] Zip submission updated with analysis results`);

            // Optionally analyze individual files if needed
            if (fileInfoList.length > 0 && fileInfoList.length <= 20) { // Limit to 20 files to avoid overload
                await this.analyzeIndividualFiles(zipSubmission, fileInfoList, String(projectId), String(userId));
            }

            return {
                success: true,
                submissionId: submissionId,
                message: 'Zip file processed and analyzed successfully',
                zipSubmission: zipSubmission
            };
        } catch (error) {
            console.error(`[${submissionId}] Error processing zip submission:`, error);

            // Update status if record was created
            if (zipSubmission) {
                zipSubmission.status = 'Failed';
                zipSubmission.updatedAt = new Date();
                await zipSubmission.save();

                // Create a CodeMark record for the failed analysis
                const codeMark = new CodeMark({
                    project: projectId,
                    student: userId,
                    submissionId: submissionId,
                    fileUrl: zipFilePath,
                    fileName: originalFilename,
                    fileType: 'zip',
                    fileLanguage: 'zip',
                    status: 'Failed',
                    feedback: `Analysis failed: ${error.message}`,
                    score: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await codeMark.save();
            }

            throw error;
        }
    }
    /**
     * Extract a zip file to the specified directory
     */
    async extractZipFile(zipFilePath, extractionPath) {
        try {
            // Ensure extraction directory exists
            await fse.ensureDir(extractionPath);

            // Extract zip file
            await fs.createReadStream(zipFilePath)
                .pipe(unzipper.Extract({ path: extractionPath }))
                .promise();

            console.log(`Extracted zip file to ${extractionPath}`);
        } catch (error) {
            console.error('Error extracting zip file:', error);
            throw error;
        }
    }

    /**
     * Scan a directory recursively to get information about all files
     * @param {string} dirPath - Path to the directory to scan
     * @param {string} basePath - Base path for relative paths
     * @param {string} projectId - Project ID for looking up tasks
     * @returns {Array} List of file information objects
     */
    async scanDirectory(dirPath, basePath = '', projectId = null) {
        const fileInfoList = [];
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        // If projectId is provided, get all tasks for this project
        let projectTasks = [];
        if (projectId) {
            const Task = require('../Models/tasks');
            try {
                projectTasks = await Task.find({ project: projectId }).populate('assignedTo');
                console.log(`Found ${projectTasks.length} tasks for project ${projectId}`);
            } catch (error) {
                console.error(`Error fetching tasks for project ${projectId}:`, error);
            }
        }

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                const subDirFiles = await this.scanDirectory(fullPath, relativePath, projectId);
                fileInfoList.push(...subDirFiles);
            } else {
                // Get file information
                const stats = await fs.promises.stat(fullPath);
                const fileExt = path.extname(entry.name).toLowerCase();

                // Try to determine student and task from file path or name
                const { student, task } = this.parseFilePathForAssociations(
                    relativePath, 
                    entry.name, 
                    projectTasks
                );

                fileInfoList.push({
                    fileName: entry.name,
                    filePath: fullPath,
                    fileType: this.getFileType(fileExt),
                    fileLanguage: this.getLanguage(fileExt),
                    fileSize: stats.size,
                    relativePath: relativePath,
                    student: student,
                    task: task
                });
            }
        }

        return fileInfoList;
    }

    /**
     * Parse file path and name to determine student and task associations
     * @param {string} relativePath - Relative path of the file
     * @param {string} fileName - Name of the file
     * @param {Array} projectTasks - List of tasks for the project
     * @returns {Object} Object with student and task IDs
     */
    parseFilePathForAssociations(relativePath, fileName, projectTasks) {
        let student = null;
        let task = null;

        // If no tasks, return null associations
        if (!projectTasks || projectTasks.length === 0) {
            return { student, task };
        }

        // Try to match by directory structure first
        // Example: /taskId_taskName/studentId_studentName/file.js
        const pathParts = relativePath.split(path.sep);

        // Try to find task and student from path parts
        for (const part of pathParts) {
            // Check if part contains task ID
            for (const projectTask of projectTasks) {
                const taskId = projectTask._id.toString();
                if (part.includes(taskId)) {
                    task = taskId;
                    // If task has an assigned student, use that
                    if (projectTask.assignedTo) {
                        student = projectTask.assignedTo._id.toString();
                    }
                    break;
                }

                // Also check by task name
                if (projectTask.name && part.toLowerCase().includes(projectTask.name.toLowerCase())) {
                    task = taskId;
                    if (projectTask.assignedTo) {
                        student = projectTask.assignedTo._id.toString();
                    }
                    break;
                }
            }
        }

        // If still no match, try to match by filename
        // Example: taskId_studentId_filename.js or studentId_taskId_filename.js
        if (!task || !student) {
            const fileNameParts = fileName.split('_');
            if (fileNameParts.length >= 2) {
                for (const part of fileNameParts) {
                    // Check if part is a valid MongoDB ObjectId
                    if (mongoose.Types.ObjectId.isValid(part)) {
                        // Check if it matches a task ID
                        const matchingTask = projectTasks.find(t => t._id.toString() === part);
                        if (matchingTask) {
                            task = part;
                            if (matchingTask.assignedTo) {
                                student = matchingTask.assignedTo._id.toString();
                            }
                            continue;
                        }

                        // Check if it matches a student ID
                        const matchingTaskByStudent = projectTasks.find(
                            t => t.assignedTo && t.assignedTo._id.toString() === part
                        );
                        if (matchingTaskByStudent) {
                            student = part;
                            task = matchingTaskByStudent._id.toString();
                        }
                    }
                }
            }
        }

        return { student, task };
    }


    /**
     * Analyze individual files within the zip
     */
    async analyzeIndividualFiles(zipSubmission, fileInfoList, projectId, userId) {
        console.log(`[${zipSubmission.submissionId}] Analyzing individual files...`);

        // Ensure projectId is a string
        const projectIdString = String(projectId);

        // Filter files that can be analyzed (code files, not binaries or images)
        const analyzableFiles = fileInfoList.filter(file =>
            file.fileType === 'Web' ||
            file.fileType === 'Backend' ||
            file.fileType === 'Configuration' ||
            file.fileType === 'Database'
        );

        for (const fileInfo of analyzableFiles) {
            try {
                // Create a unique ID for this file analysis
                const fileAnalysisId = new mongoose.Types.ObjectId().toString();

                // Determine which student ID to use for this file
                // If file has a student association, use that, otherwise use the submission owner
                const fileStudentId = fileInfo.student ? String(fileInfo.student) : String(userId);

                // Analyze the individual file
                const analysisResult = await sonarCloudService.analyzeCode(
                    fileInfo.filePath,
                    fileAnalysisId,
                    fileStudentId,
                    projectIdString, // Use the string version
                    fileInfo.fileName,
                    false
                );

                // Create a CodeMark record for this file
                const codeMark = new CodeMark({
                    project: projectId, // Original ObjectId is fine for MongoDB
                    student: fileInfo.student || userId, // Use the file's associated student
                    submissionId: fileAnalysisId,
                    fileUrl: fileInfo.filePath,
                    fileName: fileInfo.fileName,
                    fileType: fileInfo.fileType,
                    fileLanguage: fileInfo.fileLanguage,
                    sonarResults: analysisResult.analysisResults,
                    sonarProjectKey: analysisResult.projectKey,
                    score: analysisResult.score,
                    detailedScores: analysisResult.detailedScores,
                    status: 'Pending',
                    feedback: fileInfo.task
                        ? `Individual file analysis from zip submission ${zipSubmission.submissionId} for task ${fileInfo.task}`
                        : `Individual file analysis from zip submission ${zipSubmission.submissionId}`,
                    analysisSource: analysisResult.analysisSource,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await codeMark.save();

                // Update the file info in the zip submission with the analysis result reference
                const fileIndex = zipSubmission.files.findIndex(f => f.filePath === fileInfo.filePath);
                if (fileIndex !== -1) {
                    zipSubmission.files[fileIndex].analysisResult = codeMark._id;
                }
            } catch (error) {
                console.error(`[${zipSubmission.submissionId}] Error analyzing file ${fileInfo.fileName}:`, error);
                // Continue with other files even if one fails
            }
        }

        // Save the updated zip submission with file analysis references
        zipSubmission.updatedAt = new Date();
        await zipSubmission.save();

        console.log(`[${zipSubmission.submissionId}] Individual file analysis complete`);
    }

    /**
     * Generate feedback based on analysis results
     */
    generateFeedback(analysisResult) {
        const { score, detailedScores, analysisSource } = analysisResult;

        let feedback = '';

        // Add information about which analyzer was used
        if (analysisSource === 'sonarcloud') {
            feedback = 'Analysis completed using SonarCloud. ';
        } else if (analysisSource === 'localAnalyzer') {
            feedback = 'Analysis completed using local analyzer. For more detailed results, contact your instructor. ';
        } else if (analysisSource === 'defaultFallback') {
            feedback = 'Analysis based on file properties. Limited metrics available. ';
        }

        // Add score information
        feedback += `Overall score: ${score}/100. `;

        // Add detailed score breakdown if available
        if (detailedScores) {
            feedback += 'Score breakdown: ';
            feedback += `Correctness: ${detailedScores.correctnessScore}, `;
            feedback += `Security: ${detailedScores.securityScore}, `;
            feedback += `Maintainability: ${detailedScores.maintainabilityScore}, `;
            feedback += `Documentation: ${detailedScores.documentationScore}, `;
            feedback += `Clean Code: ${detailedScores.cleanCodeScore}, `;
            feedback += `Simplicity: ${detailedScores.simplicityScore}`;
        }

        return feedback;
    }

    /**
     * Helper function to determine file type from extension
     */
    getFileType(extension) {
        const webExtensions = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx'];
        const backendExtensions = ['.php', '.py', '.rb', '.java', '.c', '.cpp', '.cs', '.go'];
        const configExtensions = ['.json', '.xml', '.yml', '.yaml', '.toml', '.ini'];
        const dbExtensions = ['.sql'];
        const archiveExtensions = ['.zip', '.rar', '.tar', '.gz'];
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp'];
        const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md'];

        if (webExtensions.includes(extension)) return 'Web';
        if (backendExtensions.includes(extension)) return 'Backend';
        if (configExtensions.includes(extension)) return 'Configuration';
        if (dbExtensions.includes(extension)) return 'Database';
        if (archiveExtensions.includes(extension)) return 'Archive';
        if (imageExtensions.includes(extension)) return 'Image';
        if (documentExtensions.includes(extension)) return 'Document';

        return 'Unknown';
    }

    /**
     * Helper function to determine programming language from extension
     */
    getLanguage(extension) {
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
            '.md': 'Markdown',
            '.txt': 'Plain Text'
        };

        return languageMap[extension] || 'Unknown';
    }
}

module.exports = new ZipProjectAnalyzer();
