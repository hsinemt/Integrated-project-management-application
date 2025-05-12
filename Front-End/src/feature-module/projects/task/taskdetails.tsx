import React, { useState, useEffect } from 'react'
import ImageWithBasePath from '../../../core/common/imageWithBasePath'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { all_routes } from '../../router/all_routes'
import CommonSelect from '../../../core/common/commonSelect'
import CollapseHeader from '../../../core/common/collapse-header/collapse-header'
import * as bootstrap from 'bootstrap'
import {
    getTaskById,
    TaskType,
    CodeFileType,
    saveTaskCode,
    saveTaskCodeFile,
    updateTaskCodeFile,
    getTaskCodeFiles,
    deleteTaskCodeFile,
    ActivityType,
    getTaskActivities,
    createActivity,
    SonarAnalysisResult,
    submitCodeForAnalysis,
    checkAnalysisStatus,
    getAnalysisDetails,
    getProjectCodeAssessments
} from '../../../api/projectsApi/task/taskApi'
import { getProjectById } from '../../../api/projectsApi/project/projectApi'
import { fetchUsers, users_type } from '../../../api/getUsers/getAllUsers'
import {
    uploadAndAnalyzeZip,
    uploadZipFile,
    analyzeZipFile,
    checkZipSubmissionStatus,
    getZipSubmissionDetails,
    getZipSubmissionFiles,
    getProjectZipSubmissions,
    deleteZipFile,
    ZipSubmissionStatus,
    ZipAnalysisResult,
    ZipFileSubmission,
    ZipFileEntry
} from '../../../api/projectsApi/project/zipProjectApi'
import Editor from '@monaco-editor/react'

// API URL for backend requests
const API_URL = 'http://localhost:9777'

// Interface for file activities (local version)
interface FileActivity {
    id: string;
    type: 'create' | 'update' | 'delete';
    fileName: string;
    fileType: string;
    timestamp: string;
    username?: string;
}
interface ZipSubmissionScore {
    submissionId: string;
    fileName: string;
    score: number;
}

// Safe date formatting function with proper TypeScript types
const formatDate = (dateString: string): string => {
    try {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: '2-digit' as const,
            minute: '2-digit' as const,
            second: '2-digit' as const
        };
        const date = new Date(dateString);
        // Check if date is valid before formatting
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        return date.toLocaleString('en-US', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
};
// Function to get the ZIP assessment score
const fetchZipAssessmentScore = async (submissionId: string): Promise<number | null> => {
    try {
        // Try to get detailed submission information including analysis results
        const details = await getZipSubmissionDetails(submissionId);

        // If we have analysis data with a score, return it
        if (details.analysis && typeof details.analysis.score === 'number') {
            return details.analysis.score;
        }

        // If no analysis data or score, return null
        return null;
    } catch (error) {
        console.error('Error getting zip assessment score:', error);
        return null;
    }
};

// Helper function to check if a filename already has an extension
const hasFileExtension = (fileName: string): boolean => {
    const parts = fileName.split('.');
    // If there's at least one dot and the last part isn't empty (e.g., "file.")
    return parts.length > 1 && parts[parts.length - 1].trim().length > 0;
};

// Helper function to check if the current user is a tutor
const isUserTutor = (): boolean => {
    const userRole = localStorage.getItem('role');
    return userRole === 'tutor';
};

// Helper function to check if the current user is a student
const isUserStudent = (): boolean => {
    const userRole = localStorage.getItem('role');
    return userRole === 'student';
};

// Helper function to properly dismiss modal and clean up UI state
const dismissModalAndCleanup = (modalId: string): void => {
    try {
        // Find the modal element
        const modal = document.getElementById(modalId);
        if (modal) {
            // Get the Bootstrap modal instance
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                // Hide the modal properly
                modalInstance.hide();
            }
        }

        // Clean up ALL modal-related elements
        // Remove all modal backdrops
        const backdropElements = document.querySelectorAll('.modal-backdrop');
        backdropElements.forEach(backdrop => backdrop.remove());

        // Reset body classes and styles
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('height');

        // Ensure any other modal-related artifacts are cleaned up
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(openModal => {
            openModal.classList.remove('show');
            (openModal as HTMLElement).style.display = 'none';
            openModal.setAttribute('aria-hidden', 'true');
            openModal.removeAttribute('aria-modal');
            openModal.removeAttribute('role');
        });
    } catch (error) {
        console.error('Error cleaning up modal:', error);
        // Force clean up despite errors
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    }
};

// Helper function to get file extension based on language
const getFileExtension = (language: string): string => {
    const normalizedLang = language.toLowerCase();

    const extensionMap: {[key: string]: string} = {
        // Web languages
        'javascript': '.js',
        'typescript': '.ts',
        'html': '.html',
        'css': '.css',
        'scss': '.scss',
        'sass': '.sass',
        'jsx': '.jsx',
        'tsx': '.tsx',
        'xml': '.xml',
        'json': '.json',

        // Backend languages
        'python': '.py',
        'java': '.java',
        'csharp': '.cs',
        'cpp': '.cpp',
        'c': '.c',
        'php': '.php',
        'ruby': '.rb',
        'go': '.go',
        'rust': '.rs',
        'swift': '.swift',

        // Server/config
        'sql': '.sql',
        'yaml': '.yml',
        'markdown': '.md',
        'bash': '.sh',
        'dockerfile': 'Dockerfile',
    };

    return extensionMap[normalizedLang] || '.txt';
};

// Helper function to get icon class based on language
const getLanguageIconClass = (language: string): string => {
    const normalizedLang = language.toLowerCase();

    // Map of language to icon class
    const iconClassMap: {[key: string]: string} = {
        // Web languages
        'javascript': 'ti ti-brand-javascript',
        'js': 'ti ti-brand-javascript',
        'typescript': 'ti ti-brand-typescript',
        'ts': 'ti ti-brand-typescript',
        'html': 'ti ti-brand-html5',
        'css': 'ti ti-brand-css3',
        'scss': 'ti ti-brand-css3',
        'sass': 'ti ti-brand-css3',
        'jsx': 'ti ti-brand-react',
        'tsx': 'ti ti-brand-react',
        'react': 'ti ti-brand-react',
        'xml': 'ti ti-code',
        'json': 'ti ti-brackets',

        // Backend languages
        'python': 'ti ti-brand-python',
        'py': 'ti ti-brand-python',
        'java': 'ti ti-brand-java',
        'csharp': 'ti ti-brand-csharp',
        'cs': 'ti ti-brand-csharp',
        'cpp': 'ti ti-brand-cpp',
        'c': 'ti ti-code',
        'php': 'ti ti-brand-php',
        'ruby': 'ti ti-brand-ruby',
        'rb': 'ti ti-brand-ruby',
        'go': 'ti ti-brand-golang',
        'rust': 'ti ti-brand-rust',
        'swift': 'ti ti-brand-swift',

        // Server/config
        'sql': 'ti ti-database',
        'yaml': 'ti ti-file-code',
        'yml': 'ti ti-file-code',
        'markdown': 'ti ti-markdown',
        'md': 'ti ti-markdown',
        'bash': 'ti ti-terminal',
        'sh': 'ti ti-terminal',
        'dockerfile': 'ti ti-brand-docker',
        'docker': 'ti ti-brand-docker',
    };

    // Check if we have a specific icon class for this language
    if (iconClassMap[normalizedLang]) {
        return iconClassMap[normalizedLang];
    }

    // Fallbacks based on file category
    if (['js', 'ts', 'jsx', 'tsx'].some(ext => normalizedLang.includes(ext))) {
        return 'ti ti-brand-javascript';
    } else if (['html', 'xml', 'svg'].some(ext => normalizedLang.includes(ext))) {
        return 'ti ti-brand-html5';
    } else if (['css', 'scss', 'sass', 'less'].some(ext => normalizedLang.includes(ext))) {
        return 'ti ti-brand-css3';
    } else if (['py', 'ipynb'].some(ext => normalizedLang.includes(ext))) {
        return 'ti ti-brand-python';
    } else if (['java', 'class', 'jar'].some(ext => normalizedLang.includes(ext))) {
        return 'ti ti-brand-java';
    }

    // Default fallback
    return 'ti ti-code';
};

// Helper function to get color class for language
const getLanguageColorClass = (language: string): string => {
    const normalizedLang = language.toLowerCase();

    // Map language to Bootstrap color class
    const colorMap: {[key: string]: string} = {
        'javascript': 'warning',  // Yellow
        'js': 'warning',
        'typescript': 'info',     // Blue
        'ts': 'info',
        'html': 'danger',         // Red
        'css': 'primary',         // Blue
        'scss': 'primary',
        'sass': 'primary',
        'jsx': 'success',         // Green
        'tsx': 'success',
        'react': 'success',
        'xml': 'secondary',       // Gray
        'json': 'warning',        // Yellow

        'python': 'success',      // Green
        'py': 'success',
        'java': 'danger',         // Red
        'csharp': 'purple',       // Purple
        'cs': 'purple',
        'cpp': 'info',            // Blue
        'c': 'secondary',         // Gray
        'php': 'secondary',       // Gray
        'ruby': 'danger',         // Red
        'rb': 'danger',
        'go': 'info',             // Blue
        'rust': 'danger',         // Red
        'swift': 'danger',        // Red

        'sql': 'primary',         // Blue
        'yaml': 'warning',        // Yellow
        'yml': 'warning',
        'markdown': 'secondary',  // Gray
        'md': 'secondary',
        'bash': 'dark',           // Dark
        'sh': 'dark',
        'dockerfile': 'info',     // Blue
        'docker': 'info'
    };

    return colorMap[normalizedLang] || 'primary'; // Default to primary color
};

// Helper function to get badge class for status
const getBadgeClass = (status: string): string => {
    switch (status) {
        case 'Analyzed':
        case 'Reviewed':
            return 'bg-success';
        case 'Processing':
            return 'bg-warning';
        case 'Failed':
            return 'bg-danger';
        case 'Pending':
            return 'bg-info';
        case 'Uploaded':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
};

const TaskDetails: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<TaskType | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState<string>('');
    const [language, setLanguage] = useState<string>('javascript');
    const [savingCode, setSavingCode] = useState<boolean>(false);
    const [codeSaveError, setCodeSaveError] = useState<string | null>(null);
    const [codeSaveSuccess, setCodeSaveSuccess] = useState<boolean>(false);
    const [projectTitle, setProjectTitle] = useState<string>('');
    const [assigneeName, setAssigneeName] = useState<string>('');

    // New state variables for multiple code files
    const [codeFiles, setCodeFiles] = useState<CodeFileType[]>([]);
    const [selectedFile, setSelectedFile] = useState<CodeFileType | null>(null);
    const [newFileName, setNewFileName] = useState<string>('');
    const [fileActionError, setFileActionError] = useState<string | null>(null);
    const [fileActionSuccess, setFileActionSuccess] = useState<boolean>(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);

    // State for file activities (local version)
    const [fileActivities, setFileActivities] = useState<FileActivity[]>([]);

    // State for activities from API
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState<boolean>(false);
    const [activitiesError, setActivitiesError] = useState<string | null>(null);

    // State for tracking collapse/expand state
    const [filesExpanded, setFilesExpanded] = useState<boolean>(true);
    const [activitiesExpanded, setActivitiesExpanded] = useState<boolean>(true);
    const [codeQualityExpanded, setCodeQualityExpanded] = useState<boolean>(true);

    // State for SonarQube analysis
    const [analyzing, setAnalyzing] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [currentAnalysis, setCurrentAnalysis] = useState<SonarAnalysisResult | null>(null);
    const [assessments, setAssessments] = useState<SonarAnalysisResult[]>([]);
    const [assessmentsLoading, setAssessmentsLoading] = useState<boolean>(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);

    // File upload state variables
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

    // Zip file analysis states
    const [zipSubmissionId, setZipSubmissionId] = useState<string | null>(null);
    const [zipSubmissionStatus, setZipSubmissionStatus] = useState<ZipSubmissionStatus | null>(null);
    const [zipAnalysisResult, setZipAnalysisResult] = useState<ZipAnalysisResult | null>(null);
    const [zipPollingInterval, setZipPollingInterval] = useState<NodeJS.Timeout | null>(null);
    const [showZipAnalysisModal, setShowZipAnalysisModal] = useState<boolean>(false);

    // Zip file list states
    const [zipSubmissions, setZipSubmissions] = useState<ZipFileSubmission[]>([]);
    const [selectedZipSubmission, setSelectedZipSubmission] = useState<ZipFileSubmission | null>(null);
    const [zipFileEntries, setZipFileEntries] = useState<ZipFileEntry[]>([]);
    const [loadingZipFiles, setLoadingZipFiles] = useState<boolean>(false);
    const [zipFilesError, setZipFilesError] = useState<string | null>(null);
    const [showZipFilesModal, setShowZipFilesModal] = useState<boolean>(false);
    const [showZipFileExplorer, setShowZipFileExplorer] = useState<boolean>(false);
    const [zipFileToDelete, setZipFileToDelete] = useState<ZipFileSubmission | null>(null);
    const [deletingZipFile, setDeletingZipFile] = useState<boolean>(false);
    const [zipSubmissionScores, setZipSubmissionScores] = useState<ZipSubmissionScore[]>([]);

    // Helper function to add a new activity
    const addFileActivity = async (type: 'create' | 'update' | 'delete', fileName: string, language: string) => {
        if (!taskId) {
            console.error("Cannot create activity: taskId is missing");
            return;
        }

        // Get the current user's name from the task's createdBy field if available,
        // otherwise try to get it from localStorage, or use a default value
        const currentUser = task?.createdBy || localStorage.getItem('username') || 'User';

        // Create a local activity for immediate UI feedback
        const newActivity: FileActivity = {
            id: Date.now().toString(), // Generate a unique ID
            type,
            fileName,
            fileType: language,
            timestamp: new Date().toISOString(),
            username: currentUser
        };

        // Add the new activity to the beginning of the array (newest first)
        setFileActivities(prevActivities => [newActivity, ...prevActivities]);

        try {
            // Send the activity to the backend
            await createActivity(taskId, type, fileName, language);

            // Refresh activities from API after a short delay to allow the backend to update
            setTimeout(() => {
                fetchActivities();
            }, 500);
        } catch (error) {
            console.error("Error creating activity:", error);
            // Even if there's an error, we keep the local activity for UI consistency
        }
    };

    // Function to fetch activities from the API
    const fetchActivities = async () => {
        if (!taskId) return;

        setActivitiesLoading(true);
        setActivitiesError(null);

        try {
            const activitiesData = await getTaskActivities(taskId);
            setActivities(activitiesData);
        } catch (error: any) {
            console.error("Error fetching activities:", error);
            setActivitiesError(error?.message || "Failed to fetch activities");
        } finally {
            setActivitiesLoading(false);
        }
    };

    // Update the Code Quality table with ZIP file scores
    const updateZipScoresInTable = async () => {
        // Get all analyzed or reviewed zip submissions
        const analyzedZips = zipSubmissions.filter(
            (sub: ZipFileSubmission) => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending'
        );

        // For each analyzed zip, fetch its score if we don't already have it
        for (const submission of analyzedZips) {
            // Only fetch if we don't already have this zip's analysis result cached
            const existingResult = zipSubmissionScores.find(item => item.submissionId === submission._id);
            if (!existingResult) {
                const score = await fetchZipAssessmentScore(submission._id);
                if (score !== null) {
                    // Add to our scores list
                    setZipSubmissionScores(prev => [
                        ...prev,
                        {
                            submissionId: submission._id,
                            fileName: submission.fileName,
                            score: score
                        }
                    ]);
                }
            }
        }
    };

    // Function to fetch code assessments for the project
    const fetchAssessments = async () => {
        if (!taskId || !task?.project) return;

        setAssessmentsLoading(true);

        try {
            // First fetch regular file assessments
            const assessmentsData = await getProjectCodeAssessments(task.project);

            // Now fetch zip submissions to check for those with analysis
            await fetchZipSubmissions();

            // Set the assessments data
            setAssessments(assessmentsData);
        } catch (error: any) {
            console.error("Error fetching code assessments:", error);
            // Don't show error in UI, just log it
        } finally {
            setAssessmentsLoading(false);
        }
    };
    // Function to handle analyzing a file with SonarQube
    const handleAnalyzeFile = async (file: CodeFileType) => {
        if (!taskId || !task?.project) {
            setAnalysisError("Task or project ID is missing");
            return;
        }

        setAnalyzing(true);
        setAnalysisError(null);
        setCurrentAnalysis(null);

        try {
            // Submit the file for analysis
            const result = await submitCodeForAnalysis(task.project, file);

            if (result.success) {
                // Show the analysis modal
                setShowAnalysisModal(true);

                // Start polling for status
                await pollAnalysisStatus(result.assessmentId);

                // Refresh assessments list
                fetchAssessments();
            } else {
                throw new Error("Failed to submit code for analysis");
            }
        } catch (error: any) {
            console.error("Error analyzing file:", error);
            setAnalysisError(error?.message || "Failed to analyze code");
        } finally {
            setAnalyzing(false);
        }
    };

    // Function to poll analysis status until complete
    const pollAnalysisStatus = async (assessmentId: string) => {
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max (10 seconds * 30)

        while (attempts < maxAttempts) {
            try {
                const status = await checkAnalysisStatus(assessmentId);

                // Update current analysis with status
                setCurrentAnalysis(status);

                // If analysis is complete, get detailed results
                if (status.status !== 'Processing') {
                    try {
                        const details = await getAnalysisDetails(assessmentId);
                        setCurrentAnalysis(details);
                        return; // Exit polling
                    } catch (detailsError) {
                        console.error("Error getting analysis details:", detailsError);
                        // Continue with status only
                        return;
                    }
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
                attempts++;
            } catch (error) {
                console.error("Error polling analysis status:", error);
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
                attempts++;
            }
        }

        // If we reach here, polling timed out
        setAnalysisError("Analysis is taking longer than expected. Please check back later.");
    };

    useEffect(() => {
        const fetchTaskDetails = async () => {
            if (!taskId) {
                setError("Task ID is missing");
                setLoading(false);
                return;
            }

            try {
                const taskData = await getTaskById(taskId);
                setTask(taskData);

                // Set code and language from the first code file or from the legacy fields
                if (taskData.codeFiles && taskData.codeFiles.length > 0) {
                    const firstFile = taskData.codeFiles[0];
                    setCodeFiles(taskData.codeFiles);
                    setSelectedFile(firstFile);
                    setCode(firstFile.code);
                    setLanguage(firstFile.language);
                } else if (taskData.code) {
                    // Legacy code field support
                    setCode(taskData.code);
                    if (taskData.codeLanguage) {
                        setLanguage(taskData.codeLanguage);
                    }
                }

                // Fetch project details to get the title
                if (taskData.project) {
                    try {
                        const projectData = await getProjectById(taskData.project);
                        if (projectData && projectData.title) {
                            setProjectTitle(projectData.title);
                        }
                    } catch (projErr) {
                        console.error("Error fetching project details:", projErr);
                    }
                }

                // Set assignee name or default to ID if we have it
                if (taskData.assignedTo) {
                    // Need to use type assertion since assignedTo could be a string or object
                    const assignedTo = taskData.assignedTo as any;

                    // If assignedTo is an object with name property (populated by server)
                    if (typeof assignedTo === 'object' && assignedTo && 'name' in assignedTo) {
                        const fullName = `${assignedTo.name} ${assignedTo.lastname || ''}`.trim();
                        setAssigneeName(fullName);
                    } else {
                        // It's just an ID, so fetch the user details to get the name
                        const fetchAssigneeName = async () => {
                            try {
                                const users = await fetchUsers();
                                const assigneeId = String(taskData.assignedTo);
                                const assigneeUser = users.find(user => user._id === assigneeId);

                                if (assigneeUser) {
                                    const fullName = `${assigneeUser.name} ${assigneeUser.lastname || ''}`.trim();
                                    setAssigneeName(fullName);
                                } else {
                                    // If user not found, fall back to the ID
                                    setAssigneeName(assigneeId);
                                }
                            } catch (error) {
                                console.error("Error fetching assignee details:", error);
                                // Fall back to the ID if there's an error
                                setAssigneeName(String(taskData.assignedTo));
                            }
                        };

                        fetchAssigneeName();
                    }
                }

                setLoading(false);

                // Fetch activities after task details are loaded
                fetchActivities();

                // Fetch code assessments if project ID is available
                if (taskData.project) {
                    fetchAssessments();
                }
            } catch (err: any) {
                console.error("Error fetching task details:", err);
                setError(err?.message || "Failed to fetch task details");
                setLoading(false);
            }
        };

        fetchTaskDetails();
    }, [taskId]);

    // Effect to fetch zip submissions when task is loaded
    useEffect(() => {
        // Only fetch zip submissions if task is loaded and has a project ID
        if (task && task.project) {
            console.log('Fetching ZIP submissions after task loaded with project ID:', task.project);
            fetchZipSubmissions();
        }
    }, [task]);

    useEffect(() => {
        // When zipSubmissions changes and we have analyzed or reviewed zips,
        // update their scores in the table
        const analyzedZips = zipSubmissions.filter(
            sub => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending'
        );

        if (analyzedZips.length > 0) {
            updateZipScoresInTable();
        }
    }, [zipSubmissions]);

    // Effect to automatically retry fetching files if there's an error about missing project ID
    useEffect(() => {
        // If there's an error about missing project ID and task is loaded with a project ID, retry
        if (zipFilesError && zipFilesError.includes('Project ID is missing') && task?.project) {
            console.log('Auto-retrying fetchZipSubmissions after error with project ID:', task.project);
            // Add a small delay to ensure state is fully updated
            const retryTimer = setTimeout(() => {
                fetchZipSubmissions();
            }, 500);

            // Clean up timer
            return () => clearTimeout(retryTimer);
        }
    }, [zipFilesError, task]);

    // Cleanup effect for zip polling interval
    useEffect(() => {
        // Cleanup function to clear the polling interval when component unmounts
        return () => {
            if (zipPollingInterval) {
                clearInterval(zipPollingInterval);
            }
        };
    }, [zipPollingInterval]);

    const handleCodeChange = (value: string | undefined) => {
        setCode(value || '');
        // Reset success and error messages when code changes
        setCodeSaveSuccess(false);
        setCodeSaveError(null);

        // If a file is selected, update its code
        if (selectedFile) {
            setSelectedFile({
                ...selectedFile,
                code: value || ''
            });
        }
    };
    useEffect(() => {
        // If task is loaded and has a project ID, fetch zip submissions
        if (task && task.project && !zipSubmissions.length) {
            console.log('Auto-fetching ZIP submissions after task loaded');
            // Add a small delay to ensure all state is properly updated
            const fetchTimer = setTimeout(() => {
                fetchZipSubmissions();
            }, 500);

            // Clean up timer
            return () => clearTimeout(fetchTimer);
        }
    }, [task]);

    const handleSaveCode = async () => {
        if (!taskId) {
            setCodeSaveError("Task ID is missing");
            return;
        }

        // If no file is selected, show the "Add New File" modal to prompt for a filename
        if (!selectedFile) {
            // Open the modal to ask for a filename
            const modal = document.getElementById('add_file_modal');
            if (modal) {
                const modalInstance = new bootstrap.Modal(modal);
                modalInstance.show();
            }
            return;
        }

        // Check if code is empty
        if (!code.trim()) {
            setCodeSaveError("Code cannot be empty. Please enter some code before saving.");
            return;
        }

        setSavingCode(true);
        setCodeSaveError(null);
        setCodeSaveSuccess(false);

        try {
            // Update the existing file
            const updatedTask = await updateTaskCodeFile(
                taskId,
                selectedFile.fileName,
                {
                    code: code,
                    language: language
                }
            );
            setTask(updatedTask);

            // Update the code files list
            if (updatedTask.codeFiles) {
                setCodeFiles(updatedTask.codeFiles);
                // Find and select the updated file
                const updatedFile = updatedTask.codeFiles.find(file => file.fileName === selectedFile.fileName);
                if (updatedFile) {
                    setSelectedFile(updatedFile);
                }
            }

            setCodeSaveSuccess(true);
            setTimeout(() => {
                setCodeSaveSuccess(false);
            }, 3000); // Hide success message after 3 seconds

            // Record the file update activity
            addFileActivity('update', selectedFile.fileName, language);
        } catch (err: any) {
            console.error("Error saving code:", err);
            setCodeSaveError(err?.message || "Failed to save code");
        } finally {
            setSavingCode(false);
        }
    };


    // Function to handle creating a new file
    const handleCreateFile = async () => {
        if (!taskId) {
            setFileActionError("Task ID is missing");
            return;
        }

        if (!newFileName.trim()) {
            setFileActionError("File name is required");
            return;
        }

        // Check if the filename already has an extension
        let fileName = newFileName.trim();

        // If the filename doesn't have an extension, add one based on the language
        if (!hasFileExtension(fileName)) {
            fileName = `${fileName}${getFileExtension(language)}`;
        }

        setFileActionError(null);
        setFileActionSuccess(false);
        setSavingCode(true);

        try {
            // Use the current code from the editor instead of creating default code
            const codeToSave = code.trim() || `// ${language} code for ${fileName}`;

            const updatedTask = await saveTaskCodeFile(taskId, {
                code: codeToSave,  // Use the editor content
                language: language,
                fileName: fileName
            });

            // Update the task state with the updated task
            setTask(updatedTask);

            // Force refresh of code files list
            if (updatedTask.codeFiles) {
                // Create a new array to ensure React detects the change
                const newCodeFiles = [...updatedTask.codeFiles];
                setCodeFiles(newCodeFiles);

                // Find and select the new file
                const newFile = newCodeFiles.find(file => file.fileName === fileName);
                if (newFile) {
                    setSelectedFile(newFile);
                    setCode(newFile.code);
                    setLanguage(newFile.language);
                }
            } else {
                // If for some reason codeFiles isn't in the response, fetch them explicitly
                try {
                    const fetchedFiles = await getTaskCodeFiles(taskId);
                    setCodeFiles(fetchedFiles);

                    // Find and select the new file
                    const newFile = fetchedFiles.find(file => file.fileName === fileName);
                    if (newFile) {
                        setSelectedFile(newFile);
                        setCode(newFile.code);
                        setLanguage(newFile.language);
                    }
                } catch (fetchErr) {
                    console.error("Error fetching updated code files:", fetchErr);
                }
            }

            // Reset the new file name input
            setNewFileName('');
            setFileActionSuccess(true);
            setTimeout(() => {
                setFileActionSuccess(false);
            }, 3000);

            // Record the file creation activity
            addFileActivity('create', fileName, language);

            // Close the modal after successful file creation
            const modal = document.getElementById('add_file_modal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        } catch (err: any) {
            console.error("Error creating file:", err);
            setFileActionError(err?.message || "Failed to create file");
        } finally {
            setSavingCode(false);
        }
    };

    // Function to handle selecting a file
    const handleSelectFile = (file: CodeFileType) => {
        setSelectedFile(file);
        setCode(file.code);
        setLanguage(file.language);
        setCodeSaveSuccess(false);
        setCodeSaveError(null);
    };

    // Function to handle deleting a file
    const handleDeleteFile = (fileName: string) => {
        // Set the file to delete - this will open the modal
        setFileToDelete(fileName);

        // Show the delete confirmation modal
        const modal = document.getElementById('delete_file_modal');
        if (modal) {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        }
    };

    // Function to confirm file deletion
    const confirmDeleteFile = async () => {
        if (!taskId || !fileToDelete) {
            return;
        }

        // Only allow students to delete files
        if (!isUserStudent()) {
            setFileActionError("Only students can delete files");
            return;
        }

        setDeleting(true);
        setFileActionError(null);
        setFileActionSuccess(false);

        try {
            const updatedTask = await deleteTaskCodeFile(taskId, fileToDelete);

            // Update the task state with the updated task
            setTask(updatedTask);

            if (updatedTask.codeFiles) {
                setCodeFiles(updatedTask.codeFiles);

                // If the deleted file was selected, select another file or clear selection
                if (selectedFile && selectedFile.fileName === fileToDelete) {
                    if (updatedTask.codeFiles.length > 0) {
                        const firstFile = updatedTask.codeFiles[0];
                        setSelectedFile(firstFile);
                        setCode(firstFile.code);
                        setLanguage(firstFile.language);
                    } else {
                        setSelectedFile(null);
                        setCode('');
                        setLanguage('javascript');
                    }
                }
            }

            setFileActionSuccess(true);
            setTimeout(() => {
                setFileActionSuccess(false);
            }, 3000);

            // Find the file language before it's deleted from state
            const deletedFile = codeFiles.find(file => file.fileName === fileToDelete);
            const fileLanguage = deletedFile ? deletedFile.language : 'unknown';

            // Record the file deletion activity
            addFileActivity('delete', fileToDelete, fileLanguage);

            // Close the modal after successful deletion
            const modal = document.getElementById('delete_file_modal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }

            // Clear the file to delete
            setFileToDelete(null);
        } catch (err: any) {
            console.error("Error deleting file:", err);
            setFileActionError(err?.message || "Failed to delete file");
        } finally {
            setDeleting(false);
        }
    };

    // Function to handle file selection for upload
    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setUploadedFile(files[0]);
            setUploadError(null);
        }
    };

    // Function to fetch all zip submissions for the current project
    const fetchZipSubmissions = async () => {
        if (!task?.project) {
            console.error('Project ID is missing');
            setZipFilesError('Project ID is missing. Cannot fetch files.');
            return;
        }

        // Check if there's already a fetch in progress
        if (loadingZipFiles) {
            console.log('Already loading zip files, request skipped');
            return;
        }

        // Validate project ID format
        const projectId = task.project;
        if (typeof projectId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
            console.error('Invalid project ID format:', projectId);
            setZipFilesError(`Invalid project ID format: ${projectId}`);
            return;
        }

        // Show loading indicator and clear any previous errors
        setLoadingZipFiles(true);
        setZipFilesError(null);

        try {
            console.log('Fetching ZIP submissions for project:', projectId, 'and task:', taskId);
            // Pass both projectId and taskId to get task-specific submissions
            const submissions = await getProjectZipSubmissions(projectId, taskId);
            console.log('Received ZIP submissions:', submissions);

            if (submissions && Array.isArray(submissions)) {
                setZipSubmissions(submissions);
                console.log(`Loaded ${submissions.length} ZIP submissions`);
            } else {
                console.error('Invalid submissions data received:', submissions);
                setZipFilesError('Invalid data received from server');
            }
        } catch (error: any) {
            console.error('Error fetching zip submissions:', error);
            setZipFilesError(error?.message || 'Failed to fetch ZIP files. Please try again.');
        } finally {
            setLoadingZipFiles(false);
        }
    };

    // Function to fetch the contents of a zip file
    const fetchZipFileContents = async (submissionId: string) => {
        setLoadingZipFiles(true);
        setZipFilesError(null); // Clear any previous errors

        try {
            console.log('Fetching ZIP file contents for submission:', submissionId);
            const result = await getZipSubmissionFiles(submissionId);

            if (result && result.files && Array.isArray(result.files)) {
                setZipFileEntries(result.files);
                console.log(`Loaded ${result.files.length} files from ZIP submission`);
                return result.files;
            } else {
                console.error('Invalid file data received:', result);
                setZipFilesError('Invalid file data received from server');
                return [];
            }
        } catch (error: any) {
            console.error('Error fetching zip file contents:', error);
            setZipFilesError(error?.message || 'Failed to fetch ZIP file contents. Please try again.');
            return [];
        } finally {
            setLoadingZipFiles(false);
        }
    };

    // Function to handle selecting a zip file for viewing its contents
    const handleSelectZipFile = async (submission: ZipFileSubmission) => {
        console.log('Selected zip file:', submission);
        setSelectedZipSubmission(submission);
        setLoadingZipFiles(true);
        setZipFilesError(null);

        try {
            const fileEntries = await fetchZipFileContents(submission._id);
            if (fileEntries && fileEntries.length > 0) {
                // Automatically show the zip file explorer modal after fetching contents
                setShowZipFileExplorer(true);
            } else {
                console.log('No files found in zip archive');
                // Still show the explorer even if empty
                setShowZipFileExplorer(true);
            }
        } catch (error: any) {
            console.error('Error fetching zip file contents:', error);
            // Still show the explorer with the error message
            setZipFilesError(error?.message || 'Failed to fetch zip file contents');
            setShowZipFileExplorer(true);
        } finally {
            setLoadingZipFiles(false);
        }
    };

    // Function to handle deleting a zip file
    const handleDeleteZipFile = (submission: ZipFileSubmission) => {
        setZipFileToDelete(submission);
        // Open the delete confirmation modal
        const modal = document.getElementById('delete_zip_file_modal');
        if (modal) {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        }
    };

    // Function to confirm zip file deletion
    const confirmDeleteZipFile = async () => {
        if (!zipFileToDelete) return;

        // Only allow students to delete zip files
        if (!isUserStudent()) {
            setZipFilesError("Only students can delete zip files");
            return;
        }

        setDeletingZipFile(true);
        setZipFilesError(null);

        try {
            const result = await deleteZipFile(zipFileToDelete._id);

            if (result.success) {
                // Remove the deleted file from the state
                setZipSubmissions(prevSubmissions => 
                    prevSubmissions.filter(submission => submission._id !== zipFileToDelete._id)
                );

                // Record the file deletion activity
                addFileActivity('delete', zipFileToDelete.fileName, 'zip');

                // Close the modal
                const modal = document.getElementById('delete_zip_file_modal');
                if (modal) {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }

                // Clear the file to delete
                setZipFileToDelete(null);

                // Show success message (using existing fileActionSuccess state)
                setFileActionSuccess(true);
                setTimeout(() => {
                    setFileActionSuccess(false);
                }, 3000);
            }
        } catch (err: any) {
            console.error("Error deleting zip file:", err);
            setZipFilesError(err?.message || "Failed to delete zip file");
        } finally {
            setDeletingZipFile(false);
        }
    };

    // Function to start polling for zip submission status
    const startZipStatusPolling = (submissionId: string) => {
        // Clear any existing polling interval
        if (zipPollingInterval) {
            clearInterval(zipPollingInterval);
        }

        // Set up a new polling interval
        const interval = setInterval(async () => {
            try {
                // Check the status of the zip submission
                const status = await checkZipSubmissionStatus(submissionId);
                setZipSubmissionStatus(status);

                // If the status is no longer 'Processing', stop polling
                if (status.status !== 'Processing') {
                    // Get the detailed analysis results
                    if (status.status === 'Pending' || status.status === 'Analyzed' || status.status === 'Reviewed') {
                        if (status.analysis) {
                            setZipAnalysisResult(status.analysis);
                        } else {
                            try {
                                const details = await getZipSubmissionDetails(submissionId);
                                if (details.analysis) {
                                    setZipAnalysisResult(details.analysis);
                                }
                            } catch (error) {
                                console.error('Error getting zip submission details:', error);
                            }
                        }
                    }

                    // Refresh the list of zip submissions
                    fetchZipSubmissions();

                    // Stop polling
                    clearInterval(interval);
                    setZipPollingInterval(null);
                }
            } catch (error) {
                console.error('Error polling zip submission status:', error);
                // Stop polling on error
                clearInterval(interval);
                setZipPollingInterval(null);
            }
        }, 5000); // Poll every 5 seconds

        // Store the interval ID
        setZipPollingInterval(interval);
    };
    const checkZipSubmissionStatusOnce = async (submissionId: string): Promise<boolean> => {
        try {
            // Check the status of the zip submission
            console.log(`Checking status for submission: ${submissionId}`);
            const status = await checkZipSubmissionStatus(submissionId);
            setZipSubmissionStatus(status);

            // If we have analysis data, set it
            if (status.analysis) {
                console.log('Analysis data found in status:', status.analysis);
                setZipAnalysisResult(status.analysis);
            }

            // If the status is no longer 'Processing', we should get detailed data
            if (status.status !== 'Processing') {
                try {
                    // Get the detailed submission information including analysis results
                    console.log('Getting detailed submission data');
                    const details = await getZipSubmissionDetails(submissionId);

                    if (details.analysis) {
                        console.log('Analysis data found in details:', details.analysis);
                        setZipAnalysisResult(details.analysis);
                    }

                    // Update status with any additional information
                    if (details.submission) {
                        const updatedStatus: ZipSubmissionStatus = {
                            ...status,
                            // Update any fields that might have changed
                            status: details.submission.status,
                            analyzedFiles: details.submission.files.filter(file => file.analysisResult).length,
                            updatedAt: details.submission.updatedAt
                        };
                        setZipSubmissionStatus(updatedStatus);
                    }
                } catch (error) {
                    console.error('Error getting zip submission details:', error);
                }

                // Refresh the list of zip submissions
                try {
                    await fetchZipSubmissions();
                } catch (error) {
                    console.error('Error refreshing zip submissions:', error);
                }

                // Return false to indicate we should stop polling
                return false;
            }

            // Return true to indicate we should continue polling
            return true;
        } catch (error) {
            console.error('Error polling zip submission status:', error);
            // Stop polling on error
            return false;
        }
    };


    // Function to handle triggering analysis on a zip file
    // Function to handle triggering analysis on a zip file
    const handleAnalyzeZip = async (submissionId: string) => {
        try {
            console.log("handleAnalyzeZip called with submissionId:", submissionId);

            // Only tutors can trigger analysis
            if (localStorage.getItem('role') !== 'tutor') {
                console.log("User is not a tutor, returning");
                return;
            }

            // Get userId as string from localStorage
            const userId = String(localStorage.getItem('userId'));
            console.log("Using userId:", userId);

            // Call the API to trigger analysis with the userId parameter
            console.log("Calling analyzeZipFile API");

            // Option 1: Use modified API with userId parameter
            // This requires updating the zipProjectApi.ts file as mentioned in previous message
            const result = await analyzeZipFile(submissionId, userId);

            // Option 2: Direct fetch (use this if you can't modify the API function)
            /*
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/zip-project/zip-submission/${submissionId}/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            });
            const result = await response.json();
            */

            console.log("analyzeZipFile API result:", result);

            // Start polling for status updates
            console.log("Starting zip status polling");
            startZipStatusPolling(submissionId);

            // Show the zip analysis modal
            console.log("Showing zip analysis modal");
            setShowZipAnalysisModal(true);

            return result;
        } catch (err: any) {
            console.error("Error analyzing zip file:", err);
            alert("Error analyzing zip file: " + (err?.message || "Failed to analyze zip file"));
            return { success: false, message: err?.message || "Failed to analyze zip file" };
        }
    };

    // Function to handle file upload
    const handleFileUpload = async () => {
        if (!taskId) {
            setUploadError("Task ID is missing");
            return;
        }

        if (!uploadedFile) {
            setUploadError("Please select a file to upload");
            return;
        }

        // Check file size (limit to 10MB)
        if (uploadedFile.size > 10 * 1024 * 1024) {
            setUploadError("File size exceeds 10MB limit");
            return;
        }

        // Get file extension and determine language
        const fileName = uploadedFile.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

        // Map file extensions to languages (existing code, unchanged)
        const extensionToLanguage: {[key: string]: string} = {
            'js': 'javascript',
            'ts': 'typescript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'jsx': 'jsx',
            'tsx': 'tsx',
            'xml': 'xml',
            'json': 'json',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'sql': 'sql',
            'yml': 'yaml',
            'yaml': 'yaml',
            'md': 'markdown',
            'sh': 'bash',
            'txt': 'plaintext',
            'zip': 'zip',
            'rar': 'rar'
        };

        const language = extensionToLanguage[fileExtension] || 'plaintext';

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setUploadSuccess(false);

        // Track progress intervals for cleanup
        let progressInterval: NodeJS.Timeout | null = null;

        try {
            // Check if the file is a zip file
            if (fileExtension === 'zip') {
                // Create a simulated progress update
                progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (prev >= 90) {
                            if (progressInterval) clearInterval(progressInterval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 300);

                try {
                    // Get the project ID from the task
                    const projectId = task?.project;
                    if (!projectId) {
                        throw new Error("Project ID is missing");
                    }

                    // Upload the zip file without analysis, including the taskId
                    const result = await uploadZipFile(projectId, uploadedFile, taskId);

                    // Clear the interval and set progress to 100%
                    if (progressInterval) clearInterval(progressInterval);
                    setUploadProgress(100);

                    // Store the submission ID
                    setZipSubmissionId(result.submissionId);

                    // Create a new ZipFileSubmission object
                    const userId = localStorage.getItem('userId');
                    if (!userId) {
                        console.error('User ID is missing from localStorage');
                        setUploadError('User ID is missing. Please log in again.');
                        // Always clean up UI
                        dismissModalAndCleanup('upload_file_modal');
                        return;
                    }

                    const newZipSubmission: ZipFileSubmission = {
                        _id: result.submissionId,
                        submissionId: result.submissionId,
                        project: projectId,
                        taskId: taskId,
                        student: userId,
                        fileName: fileName,
                        fileUrl: '',
                        status: 'Uploaded',
                        files: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    // Update the zipSubmissions state array with the new submission
                    setZipSubmissions(prevSubmissions => {
                        console.log("New zip submissions array:", [newZipSubmission, ...prevSubmissions]);
                        return [newZipSubmission, ...prevSubmissions];
                    });

                    // Record the file creation activity
                    addFileActivity('create', fileName, 'zip');

                    setUploadSuccess(true);
                    setTimeout(() => {
                        setUploadSuccess(false);
                    }, 3000);

                    // Reset the file input
                    setUploadedFile(null);

                    // Always clean up UI first - THIS IS CRUCIAL
                    dismissModalAndCleanup('upload_file_modal');

                    // Fetch zip submissions again to ensure UI is updated
                    fetchZipSubmissions();

                    // If user is a tutor, automatically trigger analysis
                    if (isUserTutor()) {
                        // Start polling for status updates
                        startZipStatusPolling(result.submissionId);
                        // Show the zip analysis modal
                        setShowZipAnalysisModal(true);
                        // Trigger analysis
                        await handleAnalyzeZip(result.submissionId);
                    }
                } catch (err: any) {
                    console.error("Error uploading zip file:", err);
                    setUploadError(err?.message || "Failed to upload zip file");
                    // Always clean up UI
                    dismissModalAndCleanup('upload_file_modal');
                } finally {
                    if (progressInterval) clearInterval(progressInterval);
                    setIsUploading(false);
                }
            } else {
                // Handle regular code file upload
                // Create a promise to handle the file reading
                const readFileAsText = (file: File): Promise<string> => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            resolve(e.target?.result as string);
                        };
                        reader.onerror = () => {
                            reject(new Error("Error reading file"));
                        };
                        reader.readAsText(file);
                    });
                };

                try {
                    // Create a simulated progress update
                    progressInterval = setInterval(() => {
                        setUploadProgress(prev => {
                            if (prev >= 90) {
                                if (progressInterval) clearInterval(progressInterval);
                                return 90;
                            }
                            return prev + 10;
                        });
                    }, 300);

                    // Read file content using the promise-based approach
                    const fileContent = await readFileAsText(uploadedFile);

                    // Save the file using the existing API
                    const updatedTask = await saveTaskCodeFile(taskId, {
                        code: fileContent,
                        language: language,
                        fileName: fileName
                    });

                    // Clear the interval and set progress to 100%
                    if (progressInterval) clearInterval(progressInterval);
                    setUploadProgress(100);

                    // Update the task state with the updated task
                    setTask(updatedTask);

                    // Update the code files list
                    if (updatedTask.codeFiles) {
                        const newCodeFiles = [...updatedTask.codeFiles];
                        setCodeFiles(newCodeFiles);

                        // Find and select the new file
                        const newFile = newCodeFiles.find(file => file.fileName === fileName);
                        if (newFile) {
                            setSelectedFile(newFile);
                            setCode(newFile.code);
                            setLanguage(newFile.language);
                        }
                    } else {
                        // Fetch files explicitly if not in response
                        try {
                            const fetchedFiles = await getTaskCodeFiles(taskId);
                            setCodeFiles(fetchedFiles);

                            // Find and select the new file
                            const newFile = fetchedFiles.find(file => file.fileName === fileName);
                            if (newFile) {
                                setSelectedFile(newFile);
                                setCode(newFile.code);
                                setLanguage(newFile.language);
                            }
                        } catch (fetchErr) {
                            console.error("Error fetching updated code files:", fetchErr);
                        }
                    }

                    // Record the file creation activity
                    addFileActivity('create', fileName, language);

                    setUploadSuccess(true);
                    setTimeout(() => {
                        setUploadSuccess(false);
                    }, 3000);

                    // Reset the file input
                    setUploadedFile(null);

                    // Always clean up UI - CRUCIAL STEP
                    dismissModalAndCleanup('upload_file_modal');
                } catch (err: any) {
                    console.error("Error uploading file:", err);
                    setUploadError(err?.message || "Failed to upload file");
                    // Always clean up UI
                    dismissModalAndCleanup('upload_file_modal');
                } finally {
                    if (progressInterval) clearInterval(progressInterval);
                    setIsUploading(false);
                }
            }
        } catch (err: any) {
            console.error("Error handling file upload:", err);
            setUploadError(err?.message || "Failed to upload file");
            if (progressInterval) clearInterval(progressInterval);
            setIsUploading(false);
            // Always clean up UI
            dismissModalAndCleanup('upload_file_modal');
        }
    };

    const projectChoose = [
        { value: "Select", label: "Select" },
        { value: "Office Management", label: "Office Management" },
        { value: "Clinic Management", label: "Clinic Management" },
        { value: "Educational Platform", label: "Educational Platform" },
    ];

    const statusChoose = [
        { value: "Select", label: "Select" },
        { value: "To Do", label: "To Do" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
        { value: "In Review", label: "In Review" },
    ];

    const priorityChoose = [
        { value: "Select", label: "Select" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
        { value: "Low", label: "Low" },
    ];

    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div className="row">
                        <div className="col-12 text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2">Loading task details...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div className="row">
                        <div className="col-12 text-center">
                            <div className="alert alert-danger">
                                <i className="ti ti-alert-circle me-2"></i>
                                {error}
                            </div>
                            <Link to={all_routes.tasks} className="btn btn-primary mt-3">
                                Back to Tasks
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div className="row">
                        <div className="col-12 text-center">
                            <h3>Task not found</h3>
                            <Link to={all_routes.tasks} className="btn btn-primary mt-3">
                                Back to Tasks
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Page Wrapper */}
            <div className="page-wrapper">
                <div className="content">
                    {/* Breadcrumb */}
                    <div className="row align-items-center mb-4">
                        <div className="d-md-flex d-sm-block justify-content-between align-items-center flex-wrap">
                            <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                                <Link to={all_routes.tasks}>
                                    <i className="ti ti-arrow-left me-2" />
                                    Back to List
                                </Link>
                            </h6>
                            <div className="d-flex">
                                <div className="text-end">
                                    <Link
                                        to="#"
                                        className="btn btn-primary"
                                        data-bs-toggle="modal"
                                        data-bs-target="#edit_task"
                                    >
                                        <i className="ti ti-edit me-1" />
                                        Edit Task
                                    </Link>
                                </div>
                                <div className="head-icons ms-2 text-end">
                                    <CollapseHeader />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* /Breadcrumb */}
                    <div className="row">
                        <div className="col-xl-8">
                            <div className="card">
                                <div className="card-body pb-1">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-4">
                                        <div>
                                            <h4 className="mb-1">
                                                {task.name}
                                            </h4>
                                            <p>
                                                Priority :{" "}
                                                <span className={`badge badge-${task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'info'}`}>
                                                    <i className="ti ti-point-filled me-1" />
                                                    {task.priority}
                                                </span>
                                            </p>
                                        </div>
                                        {/*<div className="dropdown">*/}
                                        {/*    <Link*/}
                                        {/*        to="#"*/}
                                        {/*        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"*/}
                                        {/*        data-bs-toggle="dropdown"*/}
                                        {/*    >*/}
                                        {/*        <i className="ti ti-file-export me-1" /> Mark All as*/}
                                        {/*        Completed*/}
                                        {/*    </Link>*/}
                                        {/*    <ul className="dropdown-menu dropdown-menu-end p-3">*/}
                                        {/*        <li>*/}
                                        {/*            <Link*/}
                                        {/*                to="#"*/}
                                        {/*                className="dropdown-item rounded-1"*/}
                                        {/*            >*/}
                                        {/*                All Tasks*/}
                                        {/*            </Link>*/}
                                        {/*        </li>*/}
                                        {/*        <li>*/}
                                        {/*            <Link*/}
                                        {/*                to="#"*/}
                                        {/*                className="dropdown-item rounded-1"*/}
                                        {/*            >*/}
                                        {/*                This Project*/}
                                        {/*            </Link>*/}
                                        {/*        </li>*/}
                                        {/*    </ul>*/}
                                        {/*</div>*/}
                                    </div>

                                    {/* Assignee section without Add New button */}
                                    <div className="row mb-3">
                                        <div className="col-12">
                                            <div className="d-flex align-items-center bg-light p-2 rounded">
                                                <i className="ti ti-user me-2" />
                                                <span className="me-3">Assignee</span>
                                                <div className="d-flex align-items-center flex-grow-1">
                                                    <span className="avatar avatar-sm avatar-rounded bg-light me-2">
                                                        {assigneeName ? assigneeName.charAt(0).toUpperCase() : '?'}
                                                    </span>
                                                    <span className="text-muted">
                                                        {assigneeName || 'No assignee'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row align-items-center">
                                        <div className="col-sm-12">
                                            <div className="mb-3">
                                                <h6 className="mb-1">Description</h6>
                                                <p>
                                                    {task.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="custom-accordion-items">
                                <div className="accordion accordions-items-seperate">
                                    <div className="accordion-item">
                                        <div className="accordion-header" id="headingFour">
                                            <div className="accordion-button">
                                                <div className="d-flex align-items-center flex-fill">
                                                    <h5>Files</h5>
                                                    <div className=" ms-auto d-flex align-items-center">
                                                        {/* Add New File Button - Opens modal */}
                                                        <Link
                                                            to="#"
                                                            className="btn btn-primary btn-xs d-inline-flex align-items-center me-2"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#add_file_modal"
                                                        >
                                                            <i className="ti ti-square-rounded-plus-filled me-1" />
                                                            Create New File
                                                        </Link>
                                                        {/* Upload File Button - Only visible to students */}
                                                        {localStorage.getItem('role') === 'student' && (
                                                            <Link
                                                                to="#"
                                                                className="btn btn-info btn-xs d-inline-flex align-items-center me-2"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#upload_file_modal"
                                                            >
                                                                <i className="ti ti-upload me-1" />
                                                                Upload File
                                                            </Link>
                                                        )}

                                                        {/* View Zip Files Button removed as per requirements */}
                                                        <Link
                                                            to="#"
                                                            className="d-flex align-items-center collapse-arrow"
                                                            onClick={() => setFilesExpanded(!filesExpanded)}
                                                        >
                                                            <i className={`ti ti-chevron-${filesExpanded ? 'down' : 'right'} fs-18`} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            id="primaryBorderFour"
                                            className={`accordion-collapse collapse ${filesExpanded ? 'show' : ''} border-top`}
                                            aria-labelledby="headingFour"
                                        >
                                            <div className="accordion-body">
                                                {/* File Action Messages */}
                                                {fileActionError && (
                                                    <div className="alert alert-danger mb-3">
                                                        <i className="ti ti-alert-circle me-2"></i>
                                                        {fileActionError}
                                                    </div>
                                                )}
                                                {fileActionSuccess && (
                                                    <div className="alert alert-success mb-3">
                                                        <i className="ti ti-check me-2"></i>
                                                        File operation completed successfully!
                                                    </div>
                                                )}

                                                {/* Display ZIP files error message */}
                                                {zipFilesError && (
                                                    <div className="alert alert-danger mb-3">
                                                        <i className="ti ti-alert-circle me-2"></i>
                                                        {zipFilesError}
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger ms-2"
                                                            onClick={fetchZipSubmissions}
                                                        >
                                                            <i className="ti ti-refresh me-1"></i>
                                                            Retry
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Display loading indicator for ZIP files */}
                                                {loadingZipFiles && (
                                                    <div className="alert alert-info mb-3">
                                                        <i className="ti ti-loader me-2 spinner"></i>
                                                        Loading files... Please wait.
                                                    </div>
                                                )}

                                                <div className="row" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                                                    {/* Display multiple code files and zip files */}
                                                    {(codeFiles.length > 0 || zipSubmissions.length > 0) ? (
                                                        <>
                                                            {/* Display code files */}
                                                            {codeFiles.map((file, index) => (
                                                                <div className="col-md-6 col-lg-4 mb-3" key={`code-${index}`}>
                                                                    <div className="card shadow-none h-100">
                                                                        <div className={`card-body ${selectedFile && selectedFile.fileName === file.fileName ? 'bg-light-primary' : ''}`}>
                                                                            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                                                                <div className="d-flex align-items-center overflow-hidden">
                                                                                    <Link
                                                                                        to="#"
                                                                                        className="avatar avatar-md bg-light me-2"
                                                                                        onClick={() => handleSelectFile(file)}
                                                                                    >
                                                                                        <i className={`${getLanguageIconClass(file.language)} fs-24`}></i>
                                                                                    </Link>
                                                                                    <div className="overflow-hidden">
                                                                                        <h6 className="mb-1 text-truncate">
                                                                                            <Link to="#" onClick={() => handleSelectFile(file)}>
                                                                                                {file.fileName}
                                                                                            </Link>
                                                                                        </h6>
                                                                                        <span>{file.language} file</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="d-flex align-items-center">
                                                                                    <Link
                                                                                        to="#"
                                                                                        className="btn btn-sm btn-icon"
                                                                                        onClick={() => {
                                                                                            // Create a blob and download the file
                                                                                            const blob = new Blob([file.code], { type: 'text/plain' });
                                                                                            const url = URL.createObjectURL(blob);
                                                                                            const a = document.createElement('a');
                                                                                            a.href = url;
                                                                                            a.download = file.fileName;
                                                                                            document.body.appendChild(a);
                                                                                            a.click();
                                                                                            document.body.removeChild(a);
                                                                                            URL.revokeObjectURL(url);
                                                                                        }}
                                                                                    >
                                                                                        <i className="ti ti-download" />
                                                                                    </Link>
                                                                                    {isUserStudent() && (
                                                                                        <Link
                                                                                            to="#"
                                                                                            className="btn btn-sm btn-icon text-danger"
                                                                                            onClick={() => handleDeleteFile(file.fileName)}
                                                                                        >
                                                                                            <i className="ti ti-trash" />
                                                                                        </Link>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-2 d-flex justify-content-center">
                                                                                {isUserTutor() && (
                                                                                    <button
                                                                                        className="btn btn-sm btn-outline-primary"
                                                                                        onClick={() => handleAnalyzeFile(file)}
                                                                                        disabled={analyzing}
                                                                                    >
                                                                                        {analyzing ? (
                                                                                            <>
                                                                                                <i className="ti ti-loader me-1 spinner"></i>
                                                                                                Analyzing...
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <i className="ti ti-chart-bar me-1"></i>
                                                                                                Analyze with SonarQube
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <div className="d-flex align-items-center justify-content-between">
                                                                                <p className="fw-medium mb-0">
                                                                                    {file.updatedAt ? formatDate(file.updatedAt) : formatDate(new Date().toISOString())}
                                                                                </p>
                                                                                <span className={`avatar avatar-sm avatar-rounded bg-${getLanguageColorClass(file.language)}`}>
                                                                                    <i className={`${getLanguageIconClass(file.language)} text-white`} />
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Display zip files */}
                                                            {zipSubmissions.map((submission) => (
                                                                <div className="col-md-6 col-lg-4 mb-3" key={`zip-${submission._id}`}>
                                                                    <div className="card shadow-none h-100">
                                                                        <div className="card-body">
                                                                            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                                                                <div className="d-flex align-items-center overflow-hidden">
                                                                                    <Link
                                                                                        to="#"
                                                                                        className="avatar avatar-md bg-light me-2"
                                                                                        onClick={() => handleSelectZipFile(submission)}
                                                                                    >
                                                                                        <i className="ti ti-file-zip fs-24"></i>
                                                                                    </Link>
                                                                                    <div className="overflow-hidden">
                                                                                        <h6 className="mb-1 text-truncate">
                                                                                            <Link to="#" onClick={() => handleSelectZipFile(submission)}>
                                                                                                {submission.fileName}
                                                                                            </Link>
                                                                                        </h6>
                                                                                        <span>Zip archive</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="d-flex align-items-center">
                                                                                    <Link
                                                                                        to="#"
                                                                                        className="btn btn-sm btn-icon"
                                                                                        onClick={() => {
                                                                                            // Download logic for zip file
                                                                                            window.open(`${API_URL}/api/zip-project/download/${submission._id}`, '_blank');
                                                                                        }}
                                                                                    >
                                                                                        <i className="ti ti-download" />
                                                                                    </Link>
                                                                                    {isUserStudent() && (
                                                                                        <Link
                                                                                            to="#"
                                                                                            className="btn btn-sm btn-icon text-danger"
                                                                                            onClick={() => handleDeleteZipFile(submission)}
                                                                                        >
                                                                                            <i className="ti ti-trash" />
                                                                                        </Link>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-2 d-flex justify-content-center flex-column align-items-center">
    <span className={`badge ${getBadgeClass(submission.status)} mb-2`}>
        {submission.status}
    </span>

                                                                                {/* Add the SonarQube analyze button for tutors */}
                                                                                {isUserTutor() && (
                                                                                    <button
                                                                                        className="btn btn-sm btn-outline-primary mt-2"
                                                                                        onClick={(e) => {
                                                                                            console.log("Button clicked for submission:", submission._id);
                                                                                            e.stopPropagation();
                                                                                            handleAnalyzeZip(submission._id);
                                                                                        }}
                                                                                        disabled={submission.status !== 'Uploaded'}
                                                                                        title={submission.status !== 'Uploaded' ? 'Analysis is only available for files with status "Uploaded"' : 'Analyze this zip file with SonarQube'}
                                                                                    >
                                                                                        <i className="ti ti-chart-bar me-1"></i>
                                                                                        Analyze with SonarQube
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <div className="d-flex justify-content-between mt-2">
                                                                                {/* Display file count */}
                                                                                <p className="fw-medium mb-0">
                                                                                    {submission.files.length} files
                                                                                </p>
                                                                                {/* Display date */}
                                                                                <p className="fw-medium mb-0">
                                                                                    {formatDate(submission.createdAt)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    ) : task.code ? (
                                                        // Legacy code file display
                                                        <div className="card shadow-none mb-0">
                                                            <div className="card-body">
                                                                <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                                                    <div className="d-flex align-items-center overflow-hidden">
                                                                        <Link
                                                                            to="#"
                                                                            className="avatar avatar-md bg-light me-2"
                                                                        >
                                                                            <i className={`${getLanguageIconClass(task.codeLanguage || 'javascript')} fs-24`}></i>
                                                                        </Link>
                                                                        <div className="overflow-hidden">
                                                                            <h6 className="mb-1 text-truncate">
                                                                                {task.codeFileName || `code${getFileExtension(task.codeLanguage || 'javascript')}`}
                                                                            </h6>
                                                                            <span>{task.codeLanguage || 'javascript'} file</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center">
                                                                        <Link
                                                                            to="#"
                                                                            className="btn btn-sm btn-icon"
                                                                            onClick={() => {
                                                                                // Create a blob and download the file
                                                                                const blob = new Blob([task.code || ''], { type: 'text/plain' });
                                                                                const url = URL.createObjectURL(blob);
                                                                                const a = document.createElement('a');
                                                                                a.href = url;
                                                                                a.download = task.codeFileName || `code${getFileExtension(task.codeLanguage || 'javascript')}`;
                                                                                document.body.appendChild(a);
                                                                                a.click();
                                                                                document.body.removeChild(a);
                                                                                URL.revokeObjectURL(url);
                                                                            }}
                                                                        >
                                                                            <i className="ti ti-download" />
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <p className="fw-medium mb-0">
                                                                        {task.updatedAt ? formatDate(task.updatedAt) : formatDate(new Date().toISOString())}
                                                                    </p>
                                                                    <span className={`avatar avatar-sm avatar-rounded bg-${getLanguageColorClass(task.codeLanguage || 'javascript')}`}>
                                                                        <i className={`${getLanguageIconClass(task.codeLanguage || 'javascript')} text-white`} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <i className="ti ti-file-code fs-3 text-muted mb-2"></i>
                                                            <p>No code files yet. Click "Add New File" to create one.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4">
                            <div className="card">
                                <div className="card-body p-0">
                                    <div className="d-flex flex-column">
                                        <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                                            <p className="mb-0">Project</p>
                                            <h6 className="fw-normal">
                                                {/* Show project title instead of ID */}
                                                {projectTitle || task.project}
                                            </h6>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                                            <p className="mb-0">Status</p>
                                            <h6 className="fw-normal">{task.état}</h6>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                                            <p className="mb-0">Assignee</p>
                                            <h6 className="fw-normal">{assigneeName || 'Not assigned'}</h6>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                                            <p className="mb-0">Due Date</p>
                                            <h6 className="fw-normal">{task.date ? formatDate(task.date) : 'Not set'}</h6>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                                            <p className="mb-0">Creation Date</p>
                                            <h6 className="fw-normal">{task.createdAt ? formatDate(task.createdAt) : 'Not available'}</h6>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between p-3">
                                            <p className="mb-0">Created By</p>
                                            <h6 className="fw-normal">{task.createdBy || 'Not available'}</h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="custom-accordion-items">
                                <div className="accordion accordions-items-seperate">
                                    <div className="accordion-item flex-fill">
                                        <div className="accordion-header" id="headingSix">
                                            <div className="accordion-button">
                                                <div className="d-flex align-items-center flex-fill">
                                                    <h5>Activity</h5>
                                                    <div className="d-flex align-items-center ms-auto">
                                                        <Link
                                                            to="#"
                                                            className="d-flex align-items-center collapse-arrow"
                                                            onClick={() => setActivitiesExpanded(!activitiesExpanded)}
                                                        >
                                                            <i className={`ti ti-chevron-${activitiesExpanded ? 'down' : 'right'} fs-18`} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            id="primaryBorderSix"
                                            className={`accordion-collapse collapse ${activitiesExpanded ? 'show' : ''} border-top`}
                                            aria-labelledby="headingSix"
                                        >
                                            <div className="accordion-body">
                                                <div className="notice-widget" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                                    {activitiesLoading ? (
                                                        <div className="text-center p-4">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <p className="mt-2">Loading activities...</p>
                                                        </div>
                                                    ) : activitiesError ? (
                                                        <div className="alert alert-danger">
                                                            <i className="ti ti-alert-circle me-2"></i>
                                                            {activitiesError}
                                                            <button
                                                                className="btn btn-sm btn-outline-danger ms-2"
                                                                onClick={fetchActivities}
                                                            >
                                                                <i className="ti ti-refresh me-1"></i>
                                                                Retry
                                                            </button>
                                                        </div>
                                                    ) : activities.length > 0 ? (
                                                        activities.map((activity) => (
                                                            <div className="d-flex align-items-center justify-content-between mb-4" key={activity._id}>
                                                                <div className="d-flex overflow-hidden">
                                                                    <span className={`bg-${activity.actionType === 'create' ? 'success' : activity.actionType === 'update' ? 'info' : 'danger'} avatar avatar-md me-3 rounded-circle flex-shrink-0`}>
                                                                        {activity.fileLanguage === 'zip' ? (
                                                                            <i className={`ti ${activity.actionType === 'create' ? 'ti-archive-up' : activity.actionType === 'update' ? 'ti-archive' : 'ti-archive-off'} fs-16`} />
                                                                        ) : (
                                                                            <i className={`ti ${activity.actionType === 'create' ? 'ti-file-plus' : activity.actionType === 'update' ? 'ti-edit' : 'ti-trash'} fs-16`} />
                                                                        )}
                                                                    </span>
                                                                    <div className="overflow-hidden">
                                                                        <p className="text-truncate mb-1">
                                                                            <span className="text-gray-9 fw-medium">
                                                                                {activity.user ? `${activity.user.name} ${activity.user.lastname || ''}`.trim() : 'User'}
                                                                            </span>{" "}
                                                                            {activity.actionType === 'create' ? 'created' : activity.actionType === 'update' ? 'updated' : 'deleted'}{" "}
                                                                            {activity.fileLanguage === 'zip' ? 'zip archive' : 'file'}{" "}
                                                                            <span className="text-gray-9 fw-medium">
                                                                                "{activity.fileName}"
                                                                            </span>
                                                                        </p>
                                                                        <p className="mb-1">{formatDate(activity.timestamp)}</p>
                                                                        <div className="d-flex align-items-center">
                                                                            <span className={`badge badge-${activity.actionType === 'create' ? 'success' : activity.actionType === 'update' ? 'info' : 'danger'} me-2`}>
                                                                                {activity.fileLanguage === 'zip' ? (
                                                                                    <>
                                                                                        <i className="ti ti-zip me-1" />
                                                                                        ZIP Archive
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <i className={`ti ${activity.actionType === 'create' ? 'ti-file-plus' : activity.actionType === 'update' ? 'ti-edit' : 'ti-trash'} me-1`} />
                                                                                        {activity.fileLanguage}
                                                                                    </>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <i className="ti ti-activity fs-3 text-muted mb-2"></i>
                                                            <p>No activities yet. Create, update, or delete files or upload/delete zip archives to see activities here.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Replace the entire Code Quality section with this code */}
                            <div className="custom-accordion-items mt-4">
                                <div className="accordion accordions-items-seperate">
                                    <div className="accordion-item flex-fill">
                                        <div className="accordion-header" id="headingCodeQuality">
                                            <div className="accordion-button">
                                                <div className="d-flex align-items-center flex-fill">
                                                    <h5>Code Quality</h5>
                                                    <div className="d-flex align-items-center ms-auto">
                                                        <Link
                                                            to="#"
                                                            className="d-flex align-items-center collapse-arrow"
                                                            onClick={() => setCodeQualityExpanded(!codeQualityExpanded)}
                                                        >
                                                            <i className={`ti ti-chevron-${codeQualityExpanded ? 'down' : 'right'} fs-18`} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            id="primaryBorderCodeQuality"
                                            className={`accordion-collapse collapse ${codeQualityExpanded ? 'show' : ''} border-top`}
                                            aria-labelledby="headingCodeQuality"
                                        >
                                            <div className="accordion-body">
                                                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                                    {assessmentsLoading ? (
                                                        <div className="text-center p-4">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <p className="mt-2">Loading code quality assessments...</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            {/* Section toggle tabs */}
                                                            <ul className="nav nav-tabs mb-3" role="tablist">
                                                                <li className="nav-item" role="presentation">
                                                                    <button
                                                                        className="nav-link active"
                                                                        id="all-results-tab"
                                                                        data-bs-toggle="tab"
                                                                        data-bs-target="#all-results"
                                                                        type="button"
                                                                        role="tab"
                                                                        aria-controls="all-results"
                                                                        aria-selected="true"
                                                                    >
                                                                        All Results
                                                                    </button>
                                                                </li>
                                                                <li className="nav-item" role="presentation">
                                                                    <button
                                                                        className="nav-link"
                                                                        id="code-files-tab"
                                                                        data-bs-toggle="tab"
                                                                        data-bs-target="#code-files"
                                                                        type="button"
                                                                        role="tab"
                                                                        aria-controls="code-files"
                                                                        aria-selected="false"
                                                                    >
                                                                        Code Files
                                                                    </button>
                                                                </li>
                                                                <li className="nav-item" role="presentation">
                                                                    <button
                                                                        className="nav-link"
                                                                        id="zip-files-tab"
                                                                        data-bs-toggle="tab"
                                                                        data-bs-target="#zip-files"
                                                                        type="button"
                                                                        role="tab"
                                                                        aria-controls="zip-files"
                                                                        aria-selected="false"
                                                                    >
                                                                        ZIP Archives
                                                                    </button>
                                                                </li>
                                                            </ul>

                                                            <div className="tab-content">
                                                                {/* All Results Tab */}
                                                                <div className="tab-pane fade show active" id="all-results" role="tabpanel" aria-labelledby="all-results-tab">
                                                                    {assessments.length > 0 || zipSubmissions.some(sub => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending') ? (
                                                                        <div className="table-responsive">
                                                                            <table className="table table-hover">
                                                                                <thead>
                                                                                <tr>
                                                                                    <th>File</th>
                                                                                    <th>Type</th>
                                                                                    <th>Score</th>
                                                                                    <th>Date</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                {/* Regular file assessments */}
                                                                                {assessments.map((assessment) => (
                                                                                    <tr key={assessment.analysisId}>
                                                                                        <td>{assessment.fileName || 'Unknown'}</td>
                                                                                        <td>
                                                                                            <span className="badge bg-secondary">File</span>
                                                                                        </td>
                                                                                        <td>
                                                                                            <div className="d-flex align-items-center">
                                                                                                <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                                                                                    <div
                                                                                                        className={`progress-bar ${assessment.score >= 80 ? 'bg-success' : assessment.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                                                                        role="progressbar"
                                                                                                        style={{ width: `${assessment.score}%` }}
                                                                                                        aria-valuenow={assessment.score}
                                                                                                        aria-valuemin={0}
                                                                                                        aria-valuemax={100}
                                                                                                    ></div>
                                                                                                </div>
                                                                                                <span>{assessment.score}/100</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td>{assessment.timestamp ? formatDate(assessment.timestamp) : 'N/A'}</td>
                                                                                        <td>
                                                                                            <button
                                                                                                className="btn btn-sm btn-primary"
                                                                                                onClick={() => {
                                                                                                    setCurrentAnalysis(assessment);
                                                                                                    setShowAnalysisModal(true);
                                                                                                }}
                                                                                            >
                                                                                                <i className="ti ti-eye me-1"></i>
                                                                                                View
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}

                                                                                {/* ZIP file assessments */}
                                                                                {zipSubmissions
                                                                                    .filter(sub => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending')
                                                                                    .map((submission) => {
                                                                                        // Find score if available
                                                                                        const scoreData = zipSubmissionScores.find(item => item.submissionId === submission._id);

                                                                                        return (
                                                                                            <tr key={`zip-${submission._id}`}>
                                                                                                <td>{submission.fileName}</td>
                                                                                                <td>
                                                                                                    <span className="badge bg-info">ZIP</span>
                                                                                                </td>
                                                                                                <td>
                                                                                                    {scoreData ? (
                                                                                                        <div className="d-flex align-items-center">
                                                                                                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                                                                                                <div
                                                                                                                    className={`progress-bar ${
                                                                                                                        scoreData.score >= 80 ? 'bg-success' :
                                                                                                                            scoreData.score >= 60 ? 'bg-warning' :
                                                                                                                                'bg-danger'
                                                                                                                    }`}
                                                                                                                    role="progressbar"
                                                                                                                    style={{ width: `${scoreData.score}%` }}
                                                                                                                    aria-valuenow={scoreData.score}
                                                                                                                    aria-valuemin={0}
                                                                                                                    aria-valuemax={100}
                                                                                                                ></div>
                                                                                                            </div>
                                                                                                            <span>{scoreData.score}/100</span>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <span className={`badge ${getBadgeClass(submission.status)}`}>
                                                                                {submission.status}
                                                                            </span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td>{formatDate(submission.updatedAt)}</td>
                                                                                                <td>
                                                                                                    <button
                                                                                                        className="btn btn-sm btn-primary"
                                                                                                        onClick={() => {
                                                                                                            setZipSubmissionId(submission._id);
                                                                                                            checkZipSubmissionStatusOnce(submission._id);
                                                                                                            setShowZipAnalysisModal(true);
                                                                                                        }}
                                                                                                    >
                                                                                                        <i className="ti ti-eye me-1"></i>
                                                                                                        View
                                                                                                    </button>
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center p-4">
                                                                            <i className="ti ti-chart-bar fs-3 text-muted mb-2"></i>
                                                                            <p>No code quality assessments yet. Click "Analyze with SonarQube" on any file to start.</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Code Files Tab */}
                                                                <div className="tab-pane fade" id="code-files" role="tabpanel" aria-labelledby="code-files-tab">
                                                                    {assessments.length > 0 ? (
                                                                        <div className="table-responsive">
                                                                            <table className="table table-hover">
                                                                                <thead>
                                                                                <tr>
                                                                                    <th>File</th>
                                                                                    <th>Score</th>
                                                                                    <th>Date</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                {assessments.map((assessment) => (
                                                                                    <tr key={assessment.analysisId}>
                                                                                        <td>{assessment.fileName || 'Unknown'}</td>
                                                                                        <td>
                                                                                            <div className="d-flex align-items-center">
                                                                                                <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                                                                                    <div
                                                                                                        className={`progress-bar ${assessment.score >= 80 ? 'bg-success' : assessment.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                                                                        role="progressbar"
                                                                                                        style={{ width: `${assessment.score}%` }}
                                                                                                        aria-valuenow={assessment.score}
                                                                                                        aria-valuemin={0}
                                                                                                        aria-valuemax={100}
                                                                                                    ></div>
                                                                                                </div>
                                                                                                <span>{assessment.score}/100</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td>{assessment.timestamp ? formatDate(assessment.timestamp) : 'N/A'}</td>
                                                                                        <td>
                                                                                            <button
                                                                                                className="btn btn-sm btn-primary"
                                                                                                onClick={() => {
                                                                                                    setCurrentAnalysis(assessment);
                                                                                                    setShowAnalysisModal(true);
                                                                                                }}
                                                                                            >
                                                                                                <i className="ti ti-eye me-1"></i>
                                                                                                View
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center p-4">
                                                                            <i className="ti ti-file-code fs-3 text-muted mb-2"></i>
                                                                            <p>No individual file assessments yet. Click "Analyze with SonarQube" on any code file to start.</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* ZIP Files Tab */}
                                                                <div className="tab-pane fade" id="zip-files" role="tabpanel" aria-labelledby="zip-files-tab">
                                                                    {zipSubmissions.some(sub => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending') ? (
                                                                        <div className="table-responsive">
                                                                            <table className="table table-hover">
                                                                                <thead>
                                                                                <tr>
                                                                                    <th>ZIP File</th>
                                                                                    <th>Score</th>
                                                                                    <th>Status</th>
                                                                                    <th>Date</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                {zipSubmissions
                                                                                    .filter(sub => sub.status === 'Analyzed' || sub.status === 'Reviewed' || sub.status === 'Pending')
                                                                                    .map((submission) => {
                                                                                        // Find score if available
                                                                                        const scoreData = zipSubmissionScores.find(item => item.submissionId === submission._id);

                                                                                        return (
                                                                                            <tr key={`zip-detail-${submission._id}`}>
                                                                                                <td>{submission.fileName}</td>
                                                                                                <td>
                                                                                                    {scoreData ? (
                                                                                                        <div className="d-flex align-items-center">
                                                                                                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                                                                                                <div
                                                                                                                    className={`progress-bar ${
                                                                                                                        scoreData.score >= 80 ? 'bg-success' :
                                                                                                                            scoreData.score >= 60 ? 'bg-warning' :
                                                                                                                                'bg-danger'
                                                                                                                    }`}
                                                                                                                    role="progressbar"
                                                                                                                    style={{ width: `${scoreData.score}%` }}
                                                                                                                    aria-valuenow={scoreData.score}
                                                                                                                    aria-valuemin={0}
                                                                                                                    aria-valuemax={100}
                                                                                                                ></div>
                                                                                                            </div>
                                                                                                            <span>{scoreData.score}/100</span>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <span>-</span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td>
                                                                        <span className={`badge ${getBadgeClass(submission.status)}`}>
                                                                            {submission.status}
                                                                        </span>
                                                                                                </td>
                                                                                                <td>{formatDate(submission.updatedAt)}</td>
                                                                                                <td>
                                                                                                    <button
                                                                                                        className="btn btn-sm btn-primary"
                                                                                                        onClick={() => {
                                                                                                            setZipSubmissionId(submission._id);
                                                                                                            checkZipSubmissionStatusOnce(submission._id);
                                                                                                            setShowZipAnalysisModal(true);
                                                                                                        }}
                                                                                                    >
                                                                                                        <i className="ti ti-eye me-1"></i>
                                                                                                        View
                                                                                                    </button>
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center p-4">
                                                                            <i className="ti ti-file-zip fs-3 text-muted mb-2"></i>
                                                                            <p>No ZIP file assessments yet. Upload a ZIP file and click "Analyze with SonarQube" to start.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Code Editor Section */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-header">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <h5 className="card-title mb-0 me-3">
                                                Code Editor
                                                {selectedFile && (
                                                    <span className="ms-2 text-muted fs-6">
                                                        - {selectedFile.fileName}
                                                    </span>
                                                )}
                                            </h5>
                                            <div className="d-flex align-items-center ms-3">
                                                <label htmlFor="language-select" className="me-2">Language:</label>
                                                <select
                                                    id="language-select"
                                                    className="form-select form-select-sm"
                                                    value={language}
                                                    onChange={(e) => setLanguage(e.target.value)}
                                                    style={{ width: '150px' }}
                                                    disabled={!!selectedFile} // Disable if editing an existing file
                                                >
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="typescript">TypeScript</option>
                                                    <option value="html">HTML</option>
                                                    <option value="css">CSS</option>
                                                    <option value="json">JSON</option>
                                                    <option value="python">Python</option>
                                                    <option value="java">Java</option>
                                                    <option value="csharp">C#</option>
                                                    <option value="cpp">C++</option>
                                                    <option value="php">PHP</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            {selectedFile && (
                                                <button
                                                    className="btn btn-outline-primary me-2"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setCode('');
                                                        setLanguage('javascript');
                                                    }}
                                                >
                                                    <i className="ti ti-file-plus me-1"></i>
                                                    New File
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSaveCode}
                                                disabled={savingCode}
                                            >
                                                {savingCode ? (
                                                    <>
                                                        <i className="ti ti-loader me-1 spinner"></i>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ti ti-device-floppy me-1"></i>
                                                        Save Code
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {codeSaveSuccess && (
                                        <div className="alert alert-success mt-2 mb-0">
                                            Code saved successfully!
                                        </div>
                                    )}
                                    {codeSaveError && (
                                        <div className="alert alert-danger mt-2 mb-0">
                                            Error: {codeSaveError}
                                        </div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div style={{ height: '500px', border: '1px solid #ddd' }}>
                                        <Editor
                                            height="100%"
                                            language={language}
                                            value={code}
                                            onChange={handleCodeChange}
                                            theme="vs-dark"
                                            options={{
                                                minimap: { enabled: true },
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                fontSize: 14,
                                                lineNumbers: 'on',
                                                wordWrap: 'on',
                                                tabSize: 2,
                                                formatOnPaste: true,
                                                formatOnType: true,
                                            }}
                                            loading={<div className="text-center p-3">Loading editor...</div>}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
                    <p className="mb-0">2014 - 2025 © SmartHR.</p>
                    <p>
                        Designed &amp; Developed By{" "}
                        <Link to="#" className="text-primary">
                            Dreams
                        </Link>
                    </p>
                </div>
            </div>
            {/* /Page Wrapper */}

            {/* Edit Task - Replaced DatePicker that was causing issues */}
            <div className="modal fade" id="edit_task">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Edit Task</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <form action={all_routes.tasks}>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label className="form-label">Title</label>
                                            <input type="text" className="form-control" defaultValue={task.name} />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Due Date</label>
                                            <div className="input-icon-end position-relative">
                                                {/* REPLACED DatePicker with standard input to avoid date validation issues */}
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="DD-MM-YYYY"
                                                    defaultValue={task.date ? formatDate(task.date) : ''}
                                                />
                                                <span className="input-icon-addon">
                                                    <i className="ti ti-calendar text-gray-7" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Project</label>
                                            <CommonSelect
                                                className='select'
                                                options={
                                                    projectTitle
                                                        ? [...projectChoose, { value: task.project, label: projectTitle }]
                                                        : projectChoose
                                                }
                                                defaultValue={projectTitle ?
                                                    { value: task.project, label: projectTitle } :
                                                    projectChoose[0]
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Status</label>
                                            <CommonSelect
                                                className='select'
                                                options={statusChoose}
                                                defaultValue={statusChoose.find(status => status.value === task.état) || statusChoose[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Priority</label>
                                            <CommonSelect
                                                className='select'
                                                options={priorityChoose}
                                                defaultValue={priorityChoose.find(priority => priority.value === task.priority) || priorityChoose[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-3">
                                            <label className="form-label">Descriptions</label>
                                            <textarea className="form-control" rows={4} defaultValue={task.description} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light me-2"
                                    data-bs-dismiss="modal"
                                >
                                    Cancel
                                </button>
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Edit Task */}

            {/* Add New File Modal */}
            <div className="modal fade" id="add_file_modal">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Name Your File Before Saving</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {fileActionError && (
                                <div className="alert alert-danger">
                                    <i className="ti ti-alert-circle me-2"></i>
                                    {fileActionError}
                                </div>
                            )}
                            <div className="mb-3">
                                <label className="form-label">File Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter file name (e.g. main.js)"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                />
                                <small className="text-muted">
                                    If no extension is provided, one will be added based on the selected language.
                                </small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Language</label>
                                <select
                                    className="form-select"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="html">HTML</option>
                                    <option value="css">CSS</option>
                                    <option value="json">JSON</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="csharp">C#</option>
                                    <option value="cpp">C++</option>
                                    <option value="php">PHP</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light me-2"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCreateFile}
                                disabled={savingCode}
                            >
                                {savingCode ? (
                                    <>
                                        <i className="ti ti-loader me-1 spinner"></i>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-device-floppy me-1"></i>
                                        Save File
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Add New File Modal */}

            {/* Delete File Confirmation Modal */}
            <div className="modal fade" id="delete_file_modal">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Confirm Deletion</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {fileActionError && (
                                <div className="alert alert-danger">
                                    <i className="ti ti-alert-circle me-2"></i>
                                    {fileActionError}
                                </div>
                            )}
                            <div className="text-center">
                                <div className="mb-4">
                                    <i className="ti ti-alert-triangle text-danger" style={{ fontSize: '48px' }}></i>
                                </div>
                                <h5>Are you sure you want to delete the file?</h5>
                                <p className="text-muted">
                                    "{fileToDelete}"
                                </p>
                                <p>
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light me-2"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={confirmDeleteFile}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <>
                                        <i className="ti ti-loader me-1 spinner"></i>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-trash me-1"></i>
                                        Delete File
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Delete File Confirmation Modal */}

            {/* Delete Zip File Confirmation Modal */}
            <div className="modal fade" id="delete_zip_file_modal" tabIndex={-1} aria-labelledby="delete_zip_file_modal_label" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="delete_zip_file_modal_label">Delete Zip File</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="text-center">
                                <div className="mb-4">
                                    <i className="ti ti-alert-triangle text-danger" style={{ fontSize: '48px' }}></i>
                                </div>
                                <h5>Are you sure you want to delete this zip file?</h5>
                                {zipFileToDelete && (
                                    <p className="text-muted">
                                        "{zipFileToDelete.fileName}"
                                    </p>
                                )}
                                <p>
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light me-2"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={confirmDeleteZipFile}
                                disabled={deletingZipFile}
                            >
                                {deletingZipFile ? (
                                    <>
                                        <i className="ti ti-loader me-1 spinner"></i>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-trash me-1"></i>
                                        Delete Zip File
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Delete Zip File Confirmation Modal */}

            {/* Analysis Results Modal */}
            {showAnalysisModal && (
                <div className="modal-backdrop fade show"></div>
            )}
            <div className={`modal fade ${showAnalysisModal ? 'show' : ''}`} id="analysis_modal" tabIndex={-1} aria-labelledby="analysisModalLabel" aria-hidden={!showAnalysisModal} style={{ display: showAnalysisModal ? 'block' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="analysisModalLabel">
                                Code Analysis Results
                                {currentAnalysis && currentAnalysis.fileName && (
                                    <span className="ms-2 text-muted fs-6">
                                        - {currentAnalysis.fileName}
                                    </span>
                                )}
                            </h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                onClick={() => setShowAnalysisModal(false)}
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {analyzing ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Analyzing...</span>
                                    </div>
                                    <h5>Analyzing your code...</h5>
                                    <p className="text-muted">This may take a few moments. Please wait.</p>
                                    <div className="progress mt-3">
                                        <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            ) : analysisError ? (
                                <div className="alert alert-danger">
                                    <i className="ti ti-alert-circle me-2"></i>
                                    {analysisError}
                                </div>
                            ) : !currentAnalysis ? (
                                <div className="text-center p-4">
                                    <i className="ti ti-chart-bar fs-3 text-muted mb-2"></i>
                                    <p>No analysis results available.</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Overall Score */}
                                    <div className="card mb-4">
                                        <div className="card-body">
                                            <div className="row align-items-center">
                                                <div className="col-md-4 text-center">
                                                    <div className="position-relative d-inline-block">
                                                        <svg width="120" height="120" viewBox="0 0 120 120">
                                                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e6e6e6" strokeWidth="12" />
                                                            <circle
                                                                cx="60"
                                                                cy="60"
                                                                r="54"
                                                                fill="none"
                                                                stroke={currentAnalysis.score >= 80 ? '#28a745' : currentAnalysis.score >= 60 ? '#ffc107' : '#dc3545'}
                                                                strokeWidth="12"
                                                                strokeDasharray="339.292"
                                                                strokeDashoffset={339.292 * (1 - currentAnalysis.score / 100)}
                                                                transform="rotate(-90 60 60)"
                                                            />
                                                        </svg>
                                                        <div className="position-absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                            <h2 className="mb-0">{currentAnalysis.score}</h2>
                                                            <p className="mb-0">/ 100</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-8">
                                                    <h4>Overall Quality Score</h4>
                                                    <p className="text-muted">
                                                        Analysis source: <span className="badge bg-info">{currentAnalysis.analysisSource}</span>
                                                    </p>
                                                    <p className="text-muted">
                                                        Status: <span className={`badge ${getBadgeClass(currentAnalysis.status)}`}>
                                                            {currentAnalysis.status}
                                                        </span>
                                                    </p>
                                                    <p className="text-muted">
                                                        Analyzed on: {formatDate(currentAnalysis.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Scores */}
                                    {currentAnalysis.detailedScores && (
                                        <div className="card mb-4">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">Detailed Scores</h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Correctness</span>
                                                                <span>{currentAnalysis.detailedScores.correctnessScore}/30</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-success"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.correctnessScore / 30) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.correctnessScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={30}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Security</span>
                                                                <span>{currentAnalysis.detailedScores.securityScore}/20</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-danger"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.securityScore / 20) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.securityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={20}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Maintainability</span>
                                                                <span>{currentAnalysis.detailedScores.maintainabilityScore}/20</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-primary"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.maintainabilityScore / 20) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.maintainabilityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={20}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Documentation</span>
                                                                <span>{currentAnalysis.detailedScores.documentationScore}/15</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-info"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.documentationScore / 15) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.documentationScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={15}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Clean Code</span>
                                                                <span>{currentAnalysis.detailedScores.cleanCodeScore}/10</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-warning"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.cleanCodeScore / 10) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.cleanCodeScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={10}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Simplicity</span>
                                                                <span>{currentAnalysis.detailedScores.simplicityScore}/5</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-secondary"
                                                                    role="progressbar"
                                                                    style={{ width: `${(currentAnalysis.detailedScores.simplicityScore / 5) * 100}%` }}
                                                                    aria-valuenow={currentAnalysis.detailedScores.simplicityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={5}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw Metrics */}
                                    {currentAnalysis.detailedScores && currentAnalysis.detailedScores.rawMetrics && (
                                        <div className="card">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">Raw Metrics</h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <ul className="list-group list-group-flush">
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Bugs
                                                                <span className="badge bg-danger rounded-pill">{currentAnalysis.detailedScores.rawMetrics.bugs}</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Vulnerabilities
                                                                <span className="badge bg-warning rounded-pill">{currentAnalysis.detailedScores.rawMetrics.vulnerabilities}</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Code Smells
                                                                <span className="badge bg-info rounded-pill">{currentAnalysis.detailedScores.rawMetrics.codeSmells}</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Duplicated Lines (%)
                                                                <span className="badge bg-secondary rounded-pill">{currentAnalysis.detailedScores.rawMetrics.duplicatedLinesDensity}%</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <ul className="list-group list-group-flush">
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Complexity
                                                                <span className="badge bg-secondary rounded-pill">{currentAnalysis.detailedScores.rawMetrics.complexity}</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Comment Lines (%)
                                                                <span className="badge bg-info rounded-pill">{currentAnalysis.detailedScores.rawMetrics.commentLinesDensity}%</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Total Lines
                                                                <span className="badge bg-primary rounded-pill">{currentAnalysis.detailedScores.rawMetrics.totalLines}</span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Ratings (R/S/M)
                                                                <span>
                                                                    <span className="badge bg-danger me-1">{currentAnalysis.detailedScores.rawMetrics.reliabilityRating}</span>
                                                                    <span className="badge bg-warning me-1">{currentAnalysis.detailedScores.rawMetrics.securityRating}</span>
                                                                    <span className="badge bg-success">{currentAnalysis.detailedScores.rawMetrics.maintainabilityRating}</span>
                                                                </span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => setShowAnalysisModal(false)}
                            >
                                Close
                            </button>
                            {currentAnalysis && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        // Refresh assessments
                                        fetchAssessments();
                                        setShowAnalysisModal(false);
                                    }}
                                >
                                    <i className="ti ti-refresh me-1"></i>
                                    Refresh Data
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* /Analysis Results Modal */}

            {/* Zip Analysis Results Modal */}
            {/* Zip Analysis Results Modal */}
            {showZipAnalysisModal && (
                <div className="modal-backdrop fade show"></div>
            )}
            <div className={`modal fade ${showZipAnalysisModal ? 'show' : ''}`} id="zip_analysis_modal" tabIndex={-1} aria-labelledby="zipAnalysisModalLabel" aria-hidden={!showZipAnalysisModal} style={{ display: showZipAnalysisModal ? 'block' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="zipAnalysisModalLabel">
                                Zip Project Analysis Results
                                {zipSubmissionStatus && zipSubmissionStatus.zipFileName && (
                                    <span className="ms-2 text-muted fs-6">
                            - {zipSubmissionStatus.zipFileName}
                        </span>
                                )}
                            </h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                onClick={() => setShowZipAnalysisModal(false)}
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {!zipSubmissionStatus ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h5>Loading zip analysis status...</h5>
                                    <p className="text-muted">Please wait while we fetch the status of your zip file analysis.</p>
                                </div>
                            ) : zipSubmissionStatus.status === 'Processing' ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Processing...</span>
                                    </div>
                                    <h5>Processing your zip file...</h5>
                                    <p className="text-muted">This may take a few minutes. Please wait.</p>
                                    <div className="progress mt-3">
                                        <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            ) : zipSubmissionStatus.status === 'Failed' ? (
                                <div className="alert alert-danger">
                                    <i className="ti ti-alert-circle me-2"></i>
                                    The zip file analysis failed. Please try again or contact support.
                                </div>
                            ) : !zipAnalysisResult ? (
                                <div className="text-center p-4">
                                    <i className="ti ti-file-zip fs-3 text-muted mb-2"></i>
                                    <p>No analysis results available yet.</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Overall Score */}
                                    <div className="card mb-4">
                                        <div className="card-body">
                                            <div className="row align-items-center">
                                                <div className="col-md-4 text-center">
                                                    <div className="position-relative d-inline-block">
                                                        <svg width="120" height="120" viewBox="0 0 120 120">
                                                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e6e6e6" strokeWidth="12" />
                                                            <circle
                                                                cx="60"
                                                                cy="60"
                                                                r="54"
                                                                fill="none"
                                                                stroke={zipAnalysisResult.score >= 80 ? '#28a745' : zipAnalysisResult.score >= 60 ? '#ffc107' : '#dc3545'}
                                                                strokeWidth="12"
                                                                strokeDasharray="339.292"
                                                                strokeDashoffset={339.292 * (1 - zipAnalysisResult.score / 100)}
                                                                transform="rotate(-90 60 60)"
                                                            />
                                                        </svg>
                                                        <div className="position-absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                            <h2 className="mb-0">{zipAnalysisResult.score}</h2>
                                                            <p className="mb-0">/ 100</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-8">
                                                    <h4>Overall Project Quality Score</h4>
                                                    <p className="text-muted">
                                                        Analysis source: <span className="badge bg-info">{zipAnalysisResult.analysisSource}</span>
                                                    </p>
                                                    <p className="text-muted">
                                                        Status: <span className={`badge ${getBadgeClass(zipSubmissionStatus.status)}`}>
                                                {zipSubmissionStatus.status}
                                            </span>
                                                    </p>
                                                    <p className="text-muted">
                                                        Files in zip: {zipSubmissionStatus.fileCount}
                                                    </p>
                                                    <p className="text-muted">
                                                        Files analyzed: {zipSubmissionStatus.analyzedFiles} / {zipSubmissionStatus.fileCount}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Scores */}
                                    {zipAnalysisResult.detailedScores && (
                                        <div className="card mb-4">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">Detailed Scores</h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Correctness</span>
                                                                <span>{zipAnalysisResult.detailedScores.correctnessScore}/30</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-success"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.correctnessScore / 30) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.correctnessScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={30}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Security</span>
                                                                <span>{zipAnalysisResult.detailedScores.securityScore}/20</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-danger"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.securityScore / 20) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.securityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={20}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Maintainability</span>
                                                                <span>{zipAnalysisResult.detailedScores.maintainabilityScore}/20</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-warning"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.maintainabilityScore / 20) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.maintainabilityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={20}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Documentation</span>
                                                                <span>{zipAnalysisResult.detailedScores.documentationScore}/15</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-info"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.documentationScore / 15) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.documentationScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={15}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Clean Code</span>
                                                                <span>{zipAnalysisResult.detailedScores.cleanCodeScore}/10</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-primary"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.cleanCodeScore / 10) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.cleanCodeScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={10}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label d-flex justify-content-between">
                                                                <span>Simplicity</span>
                                                                <span>{zipAnalysisResult.detailedScores.simplicityScore}/5</span>
                                                            </label>
                                                            <div className="progress">
                                                                <div
                                                                    className="progress-bar bg-secondary"
                                                                    role="progressbar"
                                                                    style={{ width: `${(zipAnalysisResult.detailedScores.simplicityScore / 5) * 100}%` }}
                                                                    aria-valuenow={zipAnalysisResult.detailedScores.simplicityScore}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={5}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw Metrics - New Section */}
                                    {zipAnalysisResult.detailedScores?.rawMetrics && (
                                        <div className="card mb-4">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">Raw Metrics</h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <ul className="list-group list-group-flush">
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Bugs
                                                                <span className="badge bg-danger rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.bugs}
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Vulnerabilities
                                                                <span className="badge bg-warning rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.vulnerabilities}
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Code Smells
                                                                <span className="badge bg-info rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.codeSmells}
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Duplicated Lines (%)
                                                                <span className="badge bg-secondary rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.duplicatedLinesDensity}%
                                                    </span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <ul className="list-group list-group-flush">
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Complexity
                                                                <span className="badge bg-secondary rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.complexity}
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Comment Lines (%)
                                                                <span className="badge bg-info rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.commentLinesDensity}%
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Total Lines
                                                                <span className="badge bg-primary rounded-pill">
                                                        {zipAnalysisResult.detailedScores.rawMetrics.totalLines}
                                                    </span>
                                                            </li>
                                                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                                                Ratings (R/S/M)
                                                                <span>
                                                        <span className="badge bg-danger me-1">
                                                            {zipAnalysisResult.detailedScores.rawMetrics.reliabilityRating}
                                                        </span>
                                                        <span className="badge bg-warning me-1">
                                                            {zipAnalysisResult.detailedScores.rawMetrics.securityRating}
                                                        </span>
                                                        <span className="badge bg-success">
                                                            {zipAnalysisResult.detailedScores.rawMetrics.maintainabilityRating}
                                                        </span>
                                                    </span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Feedback */}
                                    {zipAnalysisResult.feedback && (
                                        <div className="card mb-0">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">Analysis Feedback</h5>
                                            </div>
                                            <div className="card-body">
                                                <p>{zipAnalysisResult.feedback}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => setShowZipAnalysisModal(false)}
                            >
                                Close
                            </button>
                            {zipSubmissionStatus && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        // Refresh status if we have a submission ID
                                        if (zipSubmissionId) {
                                            checkZipSubmissionStatusOnce(zipSubmissionId);
                                        }
                                    }}
                                >
                                    <i className="ti ti-refresh me-1"></i>
                                    Refresh Status
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zip Files List Modal */}
            {showZipFilesModal && (
                <div className="modal-backdrop fade show"></div>
            )}
            <div className={`modal fade ${showZipFilesModal ? 'show' : ''}`} id="zip_files_modal" tabIndex={-1} aria-labelledby="zipFilesModalLabel" aria-hidden={!showZipFilesModal} style={{ display: showZipFilesModal ? 'block' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="zipFilesModalLabel">
                                Uploaded Zip Files
                            </h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                onClick={() => setShowZipFilesModal(false)}
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {loadingZipFiles ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h5>Loading zip files...</h5>
                                </div>
                            ) : zipSubmissions.length === 0 ? (
                                <div className="text-center p-4">
                                    <i className="ti ti-file-zip fs-3 text-muted mb-2"></i>
                                    <p>No zip files have been uploaded yet.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Status</th>
                                            <th>Upload Date</th>
                                            <th>Files</th>
                                            <th>Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {zipSubmissions.map((submission) => (
                                            <tr key={submission._id}>
                                                <td>{submission.fileName}</td>
                                                <td>
                                                        <span className={`badge ${getBadgeClass(submission.status)}`}>
                                                            {submission.status}
                                                        </span>
                                                </td>
                                                <td>{formatDate(submission.createdAt)}</td>
                                                <td>{submission.files.length}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-2"
                                                        onClick={() => handleSelectZipFile(submission)}
                                                    >
                                                        <i className="ti ti-folder-open me-1"></i>
                                                        View Files
                                                    </button>

                                                    {/* Only tutors can trigger analysis */}
                                                    {isUserTutor() && (
                                                        <button
                                                            className="btn btn-sm btn-outline-success"
                                                            onClick={(e) => {
                                                                console.log("Button clicked for submission:", submission._id);
                                                                e.stopPropagation();
                                                                handleAnalyzeZip(submission._id);
                                                            }}
                                                            disabled={submission.status !== 'Uploaded'}
                                                            title={submission.status !== 'Uploaded' ? 'Analysis is only available for files with status "Uploaded"' : 'Analyze this zip file with SonarQube'}
                                                        >
                                                            <i className="ti ti-chart-bar me-1"></i>
                                                            Analyze with SonarQube
                                                        </button>
                                                    )}

                                                    {/* Show view analysis button if analysis is complete */}
                                                    {(submission.status === 'Analyzed' ||
                                                        submission.status === 'Pending' ||
                                                        submission.status === 'Reviewed') && (
                                                        <button
                                                            className="btn btn-sm btn-outline-info"
                                                            onClick={() => {
                                                                setZipSubmissionId(submission._id);
                                                                startZipStatusPolling(submission._id);
                                                                setShowZipAnalysisModal(true);
                                                            }}
                                                        >
                                                            <i className="ti ti-chart-pie me-1"></i>
                                                            View Analysis
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => setShowZipFilesModal(false)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={fetchZipSubmissions}
                            >
                                <i className="ti ti-refresh me-1"></i>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Zip Files List Modal */}

            {/* Zip File Explorer Modal */}
            {showZipFileExplorer && (
                <div className="modal-backdrop fade show"></div>
            )}
            <div className={`modal fade ${showZipFileExplorer ? 'show' : ''}`} id="zip_file_explorer_modal" tabIndex={-1} aria-labelledby="zipFileExplorerModalLabel" aria-hidden={!showZipFileExplorer} style={{ display: showZipFileExplorer ? 'block' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="zipFileExplorerModalLabel">
                                Zip File Contents
                                {selectedZipSubmission && (
                                    <span className="ms-2 text-muted fs-6">
                                        - {selectedZipSubmission.fileName}
                                    </span>
                                )}
                            </h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                onClick={() => setShowZipFileExplorer(false)}
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {loadingZipFiles ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border text-primary mb-3" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h5>Loading file contents...</h5>
                                </div>
                            ) : zipFileEntries.length === 0 ? (
                                <div className="text-center p-4">
                                    <i className="ti ti-file-zip fs-3 text-muted mb-2"></i>
                                    <p>No files found in this zip archive.</p>
                                </div>
                            ) : (
                                <div className="row">
                                    {zipFileEntries.map((file, index) => (
                                        <div className="col-md-6" key={index}>
                                            <div className="d-flex mb-4">
                                                <div className="flex-shrink-0">
                                                    <div className="avatar avatar-md bg-light me-3">
                                                        <i className={`${getLanguageIconClass(file.fileLanguage)} fs-24`}></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{file.fileName}</h6>
                                                    <p className="text-muted mb-1">{file.fileLanguage} file</p>
                                                    <div className="mb-2">
                                                        <p className="mb-0"><strong>Path:</strong> {file.relativePath || file.filePath}</p>
                                                        <p className="mb-0"><strong>Size:</strong> {Math.round(file.fileSize / 1024)} KB</p>
                                                        <p className="mb-0"><strong>Type:</strong> {file.fileType}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowZipFileExplorer(false)}
                            >
                                Close
                            </button>
                            {selectedZipSubmission && isUserTutor() && (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={(e) => {
                                        console.log("Button clicked for selectedZipSubmission:", selectedZipSubmission._id);
                                        e.stopPropagation();
                                        handleAnalyzeZip(selectedZipSubmission._id);
                                        setShowZipFileExplorer(false);
                                    }}
                                    disabled={selectedZipSubmission.status !== 'Uploaded'}
                                    title={selectedZipSubmission.status !== 'Uploaded' ? 'Analysis is only available for files with status "Uploaded"' : 'Analyze this zip file with SonarQube'}
                                >
                                    <i className="ti ti-chart-bar me-1"></i>
                                    Analyze with SonarQube
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* /Zip File Explorer Modal */}

            {/* Upload File Modal */}
            <div className="modal fade" id="upload_file_modal">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Upload File</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {uploadError && (
                                <div className="alert alert-danger">
                                    <i className="ti ti-alert-circle me-2"></i>
                                    {uploadError}
                                </div>
                            )}
                            {uploadSuccess && (
                                <div className="alert alert-success">
                                    <i className="ti ti-check me-2"></i>
                                    File uploaded successfully!
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label">Select File to Upload</label>
                                <input
                                    type="file"
                                    className="form-control"
                                    onChange={handleFileSelection}
                                    accept=".js,.ts,.html,.css,.scss,.sass,.jsx,.tsx,.xml,.json,.py,.java,.cs,.cpp,.c,.php,.rb,.go,.rs,.swift,.sql,.yml,.yaml,.md,.sh,.txt,.zip,.rar"
                                    disabled={isUploading}
                                />
                                <small className="text-muted">
                                    Supported file types: JavaScript, TypeScript, HTML, CSS, Python, Java, C#, C++, PHP, and more. Max size: 10MB.
                                </small>
                            </div>

                            {uploadedFile && (
                                <div className="alert alert-info">
                                    <div className="d-flex align-items-center">
                                        <i className="ti ti-file me-2 fs-4"></i>
                                        <div>
                                            <strong>{uploadedFile.name}</strong>
                                            <div className="text-muted">{(uploadedFile.size / 1024).toFixed(2)} KB</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isUploading && (
                                <div className="mt-3">
                                    <label className="form-label d-flex justify-content-between">
                                        <span>Upload Progress</span>
                                        <span>{uploadProgress}%</span>
                                    </label>
                                    <div className="progress">
                                        <div
                                            className="progress-bar progress-bar-striped progress-bar-animated"
                                            role="progressbar"
                                            style={{ width: `${uploadProgress}%` }}
                                            aria-valuenow={uploadProgress}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 border-top pt-3">
                                <div className="d-flex align-items-center">
                                    <i className="ti ti-info-circle text-primary me-2"></i>
                                    <small>
                                        Files will be uploaded to the task and can be viewed by all team members.
                                        The file content will be analyzed to determine the appropriate language.
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light me-2"
                                data-bs-dismiss="modal"
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleFileUpload}
                                disabled={!uploadedFile || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <i className="ti ti-loader me-1 spinner"></i>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-upload me-1"></i>
                                        Upload File
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Upload File Modal */}
        </>
    )
}

export default TaskDetails
