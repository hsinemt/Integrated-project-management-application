import React, { useState, useEffect } from 'react'
import ImageWithBasePath from '../../../core/common/imageWithBasePath'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { all_routes } from '../../router/all_routes'
import CommonSelect from '../../../core/common/commonSelect'
// Remove DatePicker import that's causing issues
// import { DatePicker } from 'antd'
import CommonTagsInput from '../../../core/common/Taginput'
import CollapseHeader from '../../../core/common/collapse-header/collapse-header'
// Import bootstrap for modal handling
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
    SonarAnalysisResult,
    submitCodeForAnalysis,
    checkAnalysisStatus,
    getAnalysisDetails,
    getProjectCodeAssessments
} from '../../../api/projectsApi/task/taskApi'

// Interface for file activities (local version)
interface FileActivity {
    id: string;
    type: 'create' | 'update' | 'delete';
    fileName: string;
    fileType: string;
    timestamp: string;
    username?: string;
}
import { getProjectById } from '../../../api/projectsApi/project/projectApi'
import Editor from '@monaco-editor/react'

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

// Helper function to check if a filename already has an extension
const hasFileExtension = (fileName: string): boolean => {
    const parts = fileName.split('.');
    // If there's at least one dot and the last part isn't empty (e.g., "file.")
    return parts.length > 1 && parts[parts.length - 1].trim().length > 0;
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

    // Helper function to add a new activity
    const addFileActivity = (type: 'create' | 'update' | 'delete', fileName: string, language: string) => {
        // Get the current user's name from the task's createdBy field if available,
        // otherwise try to get it from localStorage, or use a default value
        const currentUser = task?.createdBy || localStorage.getItem('username') || 'User';

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

        // Refresh activities from API after a short delay to allow the backend to update
        setTimeout(() => {
            fetchActivities();
        }, 500);
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

    // Function to fetch code assessments for the project
    const fetchAssessments = async () => {
        if (!taskId || !task?.project) return;

        setAssessmentsLoading(true);

        try {
            const assessmentsData = await getProjectCodeAssessments(task.project);
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
                        // Just use the string value as is (likely a user's name or ID)
                        setAssigneeName(String(taskData.assignedTo));
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
                                        <div className="dropdown">
                                            <Link
                                                to="#"
                                                className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                                                data-bs-toggle="dropdown"
                                            >
                                                <i className="ti ti-file-export me-1" /> Mark All as
                                                Completed
                                            </Link>
                                            <ul className="dropdown-menu dropdown-menu-end p-3">
                                                <li>
                                                    <Link
                                                        to="#"
                                                        className="dropdown-item rounded-1"
                                                    >
                                                        All Tasks
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        to="#"
                                                        className="dropdown-item rounded-1"
                                                    >
                                                        This Project
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
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
                                                            className="btn btn-primary btn-xs d-inline-flex align-items-center me-3"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#add_file_modal"
                                                        >
                                                            <i className="ti ti-square-rounded-plus-filled me-1" />
                                                            Create New File
                                                        </Link>
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

                                                <div className="row" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                                                    {/* Display multiple code files */}
                                                    {codeFiles && codeFiles.length > 0 ? (
                                                        codeFiles.map((file, index) => (
                                                            <div className="col-md-6 col-lg-4 mb-3" key={index}>
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
                                                                                <Link
                                                                                    to="#"
                                                                                    className="btn btn-sm btn-icon text-danger"
                                                                                    onClick={() => handleDeleteFile(file.fileName)}
                                                                                >
                                                                                    <i className="ti ti-trash" />
                                                                                </Link>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-2 d-flex justify-content-center">
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
                                                        ))
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
                                                                        <i className={`ti ${activity.actionType === 'create' ? 'ti-file-plus' : activity.actionType === 'update' ? 'ti-edit' : 'ti-trash'} fs-16`} />
                                                                    </span>
                                                                    <div className="overflow-hidden">
                                                                        <p className="text-truncate mb-1">
                                                                            <span className="text-gray-9 fw-medium">
                                                                                {activity.user ? `${activity.user.name} ${activity.user.lastname || ''}`.trim() : 'User'}
                                                                            </span>{" "}
                                                                            {activity.actionType === 'create' ? 'created' : activity.actionType === 'update' ? 'updated' : 'deleted'} file{" "}
                                                                            <span className="text-gray-9 fw-medium">
                                                                                "{activity.fileName}"
                                                                            </span>
                                                                        </p>
                                                                        <p className="mb-1">{formatDate(activity.timestamp)}</p>
                                                                        <div className="d-flex align-items-center">
                                                                            <span className={`badge badge-${activity.actionType === 'create' ? 'success' : activity.actionType === 'update' ? 'info' : 'danger'} me-2`}>
                                                                                <i className={`ti ${activity.actionType === 'create' ? 'ti-file-plus' : activity.actionType === 'update' ? 'ti-edit' : 'ti-trash'} me-1`} />
                                                                                {activity.fileLanguage}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <i className="ti ti-activity fs-3 text-muted mb-2"></i>
                                                            <p>No file activities yet. Create, update, or delete files to see activities here.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                                    {assessmentsLoading ? (
                                                        <div className="text-center p-4">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <p className="mt-2">Loading code quality assessments...</p>
                                                        </div>
                                                    ) : assessments.length > 0 ? (
                                                        <div className="table-responsive">
                                                            <table className="table table-hover">
                                                                <thead>
                                                                    <tr>
                                                                        <th>File</th>
                                                                        <th>Score</th>
                                                                        {/*<th>Status</th>*/}
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
                                                                            {/*<td>*/}
                                                                            {/*    <span className={`badge ${*/}
                                                                            {/*        assessment.status === 'Analyzed' || assessment.status === 'Reviewed' ? 'bg-success' : */}
                                                                            {/*        assessment.status === 'Processing' ? 'bg-warning' : */}
                                                                            {/*        assessment.status === 'Failed' ? 'bg-danger' : 'bg-secondary'*/}
                                                                            {/*    }`}>*/}
                                                                            {/*        {assessment.status}*/}
                                                                            {/*    </span>*/}
                                                                            {/*</td>*/}
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
                                                            <i className="ti ti-chart-bar fs-3 text-muted mb-2"></i>
                                                            <p>No code quality assessments yet. Click "Analyze with SonarQube" on any file to start.</p>
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

            {/* Analysis Results Modal */}
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
                                                        Status: <span className={`badge ${
                                                            currentAnalysis.status === 'Analyzed' || currentAnalysis.status === 'Reviewed' ? 'bg-success' : 
                                                            currentAnalysis.status === 'Processing' ? 'bg-warning' : 
                                                            currentAnalysis.status === 'Failed' ? 'bg-danger' : 'bg-secondary'
                                                        }`}>{currentAnalysis.status}</span>
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
        </>
    )
}

export default TaskDetails
