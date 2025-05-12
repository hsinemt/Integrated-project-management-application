import axios from "axios";
const API_URL = 'http://localhost:9777';

export interface ZipFileSubmission {
    _id: string;
    submissionId: string;
    project: string;
    student: string;
    taskId?: string; // Optional task ID field
    fileName: string;
    fileUrl: string;
    status: 'Processing' | 'Pending' | 'Analyzed' | 'Failed' | 'Reviewed' | 'Uploaded';
    files: ZipFileEntry[];
    createdAt: string;
    updatedAt: string;
}

export interface ZipFileEntry {
    fileName: string;
    filePath: string;
    fileType: string;
    fileLanguage: string;
    fileSize: number;
    relativePath: string;
    student?: string;
    task?: string;
    analysisResult?: string;
}

export interface ZipAnalysisResult {
    score: number;
    detailedScores?: {
        correctnessScore: number;
        securityScore: number;
        maintainabilityScore: number;
        documentationScore: number;
        cleanCodeScore: number;
        simplicityScore: number;
        rawMetrics?: {
            bugs: number;
            vulnerabilities: number;
            codeSmells: number;
            duplicatedLinesDensity: number;
            complexity: number;
            commentLinesDensity: number;
            totalLines: number;
            reliabilityRating: string; // A, B, C, D, E
            securityRating: string;    // A, B, C, D, E
            maintainabilityRating: string; // A, B, C, D, E
        }
    };
    analysisSource: string;
    feedback: string;
    status: 'Processing' | 'Pending' | 'Analyzed' | 'Failed' | 'Reviewed' | 'Uploaded';
    sonarResults?: any;
    sonarProjectKey?: string;
}

export interface ZipSubmissionStatus {
    id: string;
    status: 'Processing' | 'Pending' | 'Analyzed' | 'Failed' | 'Reviewed' | 'Uploaded';
    submissionId: string;
    zipFileName: string;
    fileCount: number;
    filesWithStudents: number;
    filesWithTasks: number;
    analyzedFiles: number;
    createdAt: string;
    updatedAt: string;
    analysis?: ZipAnalysisResult;
}

/**
 * Upload a zip file without analysis
 * @param projectId - The project ID
 * @param zipFile - The zip file to upload
 * @param taskId - The task ID (optional)
 * @returns The submission ID and initial status
 */
export const uploadZipFile = async (projectId: string, zipFile: File, taskId?: string): Promise<{ success: boolean, submissionId: string }> => {
    try {
        const token = localStorage.getItem('token');

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('codeFile', zipFile);

        // Add taskId to the form data if provided
        if (taskId) {
            formData.append('taskId', taskId);
        }

        const response = await axios.post(
            `${API_URL}/api/zip-project/${projectId}/upload-zip`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            }
        );

        return {
            success: response.data.success,
            submissionId: response.data.submissionInfo?.submissionId || ''
        };
    } catch (error: any) {
        console.error('Error uploading zip file:', error);
        throw error.response ? error.response.data : { message: 'Failed to upload zip file, please try again later.' };
    }
};

/**
 * Analyze a previously uploaded zip file
 * @param submissionId - The submission ID
 * @returns Success status
 */
export const analyzeZipFile = async (submissionId: string, userId?: string): Promise<{ success: boolean, message: string }> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.post(
            `${API_URL}/api/zip-project/zip-submission/${submissionId}/analyze`,
            // Include userId in the request body if provided
            userId ? { userId: String(userId) } : {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return {
            success: response.data.success,
            message: response.data.message
        };
    } catch (error: any) {
        console.error('Error analyzing zip file:', error);
        throw error.response ? error.response.data : { message: 'Failed to analyze zip file, please try again later.' };
    }
};

/**
 * Upload and analyze a zip file (legacy function for backward compatibility)
 * @param projectId - The project ID
 * @param zipFile - The zip file to upload
 * @returns The submission ID and initial status
 */
export const uploadAndAnalyzeZip = async (projectId: string, zipFile: File): Promise<{ success: boolean, submissionId: string }> => {
    try {
        const token = localStorage.getItem('token');

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('codeFile', zipFile);

        const response = await axios.post(
            `${API_URL}/api/zip-project/${projectId}/analyze-zip`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            }
        );

        return {
            success: response.data.success,
            submissionId: response.data.submissionInfo?.submissionId || ''
        };
    } catch (error: any) {
        console.error('Error uploading zip file:', error);
        throw error.response ? error.response.data : { message: 'Failed to upload zip file, please try again later.' };
    }
};

/**
 * Check the status of a zip submission
 * @param submissionId - The submission ID
 * @returns The submission status
 */
export const checkZipSubmissionStatus = async (submissionId: string): Promise<ZipSubmissionStatus> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/zip-project/zip-submission/${submissionId}/status`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.submission;
    } catch (error: any) {
        console.error('Error checking zip submission status:', error);
        throw error.response ? error.response.data : { message: 'Failed to check submission status, please try again later.' };
    }
};

/**
 * Get details of a zip submission
 * @param submissionId - The submission ID
 * @returns The submission details
 */
export const getZipSubmissionDetails = async (submissionId: string): Promise<{ submission: ZipFileSubmission, analysis: ZipAnalysisResult | null }> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/zip-project/zip-submission/${submissionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return {
            submission: response.data.submission,
            analysis: response.data.analysis
        };
    } catch (error: any) {
        console.error('Error getting zip submission details:', error);
        throw error.response ? error.response.data : { message: 'Failed to get submission details, please try again later.' };
    }
};

/**
 * Get files from a zip submission
 * @param submissionId - The submission ID
 * @returns The files in the submission
 */
export const getZipSubmissionFiles = async (submissionId: string): Promise<{ submissionId: string, zipFileName: string, fileCount: number, files: ZipFileEntry[] }> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/zip-project/zip-submission/${submissionId}/files`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return {
            submissionId: response.data.submissionId,
            zipFileName: response.data.zipFileName,
            fileCount: response.data.fileCount,
            files: response.data.files
        };
    } catch (error: any) {
        console.error('Error getting zip submission files:', error);
        throw error.response ? error.response.data : { message: 'Failed to get submission files, please try again later.' };
    }
};

/**
 * Get all zip submissions for a project
 * @param projectId - The project ID
 * @param taskId - The task ID (optional)
 * @returns The list of submissions
 */
export const getProjectZipSubmissions = async (projectId: string, taskId?: string): Promise<ZipFileSubmission[]> => {
    try {
        const token = localStorage.getItem('token');

        // Build the URL with optional taskId parameter
        let url = `${API_URL}/api/zip-project/${projectId}/zip-submissions`;
        if (taskId) {
            url += `?taskId=${taskId}`;
        }

        const response = await axios.get(
            url,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.submissions;
    } catch (error: any) {
        console.error('Error getting project zip submissions:', error);
        throw error.response ? error.response.data : { message: 'Failed to get project submissions, please try again later.' };
    }
};

/**
 * Delete a zip file submission
 * @param submissionId - The submission ID to delete
 * @returns Success status and message
 */
export const deleteZipFile = async (submissionId: string): Promise<{ success: boolean, message: string }> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.delete(
            `${API_URL}/api/zip-project/zip-submission/${submissionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return {
            success: response.data.success,
            message: response.data.message
        };
    } catch (error: any) {
        console.error('Error deleting zip file:', error);
        throw error.response ? error.response.data : { message: 'Failed to delete zip file, please try again later.' };
    }
};
