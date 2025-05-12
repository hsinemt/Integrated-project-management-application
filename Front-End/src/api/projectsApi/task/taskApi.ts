import axios from "axios";
import {getAllProjects} from "../project/projectApi";
const API_URL = 'http://localhost:9777';

export interface ActivityType {
    _id: string;
    taskId: string;
    userId: string;
    actionType: 'create' | 'update' | 'delete';
    fileId?: string;
    fileName: string;
    fileLanguage: string;
    timestamp: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        name: string;
        lastname: string;
        avatar?: string;
    }
}

export interface ActivitiesResponse {
    success: boolean;
    activities: ActivityType[];
}

export interface CodeFileType {
    _id: string;
    code: string;
    language: string;
    fileName: string;
    taskId: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskType {
    _id: string;
    name: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    date: string;
    état: 'To Do' | 'In Progress' | 'Completed' | 'In Review';
    image?: string;
    project: string;
    group: string;
    assignedTo: string;
    // Original code fields for backward compatibility
    code?: string;
    codeLanguage?: string;
    codeFileName?: string;
    // New field for multiple code files
    codeFiles?: CodeFileType[];
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export interface TasksResponse {
    success: boolean;
    tasks: TaskType[];
}

export interface TaskCountsType {
    total: number;
    completed: number;
}


export const getTasksByProjectId = async (projectId: string): Promise<TaskType[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<TasksResponse>(
            `${API_URL}/project/${projectId}/tasks`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.tasks || [];
    } catch (error: any) {
        console.error('Error fetching tasks for project:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch tasks, please try again later.'};
    }
};


export const getTaskCountsByProjectId = async (projectId: string): Promise<TaskCountsType> => {
    try {
        const tasks = await getTasksByProjectId(projectId);
        const total = tasks.length;
        const completed = tasks.filter(task => task.état === 'Completed').length;

        return { total, completed };
    } catch (error) {
        console.error(`Error getting task counts for project ${projectId}:`, error);
        return { total: 0, completed: 0 };
    }
};


export const createTask = async (projectId: string, taskData: Omit<TaskType, '_id'>): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.post<{success: boolean, task: TaskType}>(
            `${API_URL}/project/${projectId}/tasks`,
            taskData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error creating task:', error);
        throw error.response ? error.response.data : {message: 'Failed to create task, please try again later.'};
    }
};

export const updateTaskStatus = async (taskId: string, status: 'To Do' | 'In Progress' | 'Completed' | 'In Review'): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.put<{message: string, task: TaskType}>(
            `${API_URL}/project/tasks/${taskId}/status`,
            { etat: status },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error updating task status:', error);
        throw error.response ? error.response.data : {message: 'Failed to update task status, please try again later.'};
    }
};

export const getTaskById = async (taskId: string): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<{success: boolean, task: TaskType}>(
            `${API_URL}/project/tasks/${taskId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error fetching task details:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch task details, please try again later.'};
    }
};

export const saveTaskCode = async (taskId: string, code: string, language: string): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.put<{success: boolean, task: TaskType}>(
            `${API_URL}/project/tasks/${taskId}/code`,
            { code, codeLanguage: language },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error saving task code:', error);
        throw error.response ? error.response.data : {message: 'Failed to save code, please try again later.'};
    }
};

// Function to create a new code file for a task
export const saveTaskCodeFile = async (
    taskId: string,
    codeFile: { code: string; language: string; fileName: string }
): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        // Validate that code is not empty
        if (!codeFile.code) {
            throw { message: 'Code is required and cannot be empty' };
        }

        const sanitizedCodeFile = {
            ...codeFile
        };

        const response = await axios.post<{success: boolean, task: TaskType}>(
            `${API_URL}/api/tasks/${taskId}/codefiles`,
            sanitizedCodeFile,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error creating task code file:', error);
        throw error.response ? error.response.data : {message: 'Failed to create code file, please try again later.'};
    }
};

// Function to update an existing code file in a task
export const updateTaskCodeFile = async (
    taskId: string,
    fileName: string,
    updates: { code?: string; language?: string }
): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        // First, get the file ID
        const codeFiles = await getTaskCodeFiles(taskId);
        const codeFile = codeFiles.find(file => file.fileName === fileName);

        if (!codeFile) {
            throw new Error(`Code file with name ${fileName} not found`);
        }

        // Validate that if code is provided, it's not empty
        if (updates.code !== undefined && !updates.code) {
            throw { message: 'Code cannot be empty' };
        }

        const response = await axios.put<{success: boolean, task: TaskType}>(
            `${API_URL}/api/codefiles/${codeFile._id}`,
            updates,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error updating task code file:', error);
        throw error.response ? error.response.data : {message: 'Failed to update code file, please try again later.'};
    }
};

// Function to get all code files for a task
export const getTaskCodeFiles = async (taskId: string): Promise<CodeFileType[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<{success: boolean, codeFiles: CodeFileType[]}>(
            `${API_URL}/api/tasks/${taskId}/codefiles`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.codeFiles || [];
    } catch (error: any) {
        console.error('Error getting task code files:', error);
        throw error.response ? error.response.data : {message: 'Failed to get code files, please try again later.'};
    }
};

// Function to delete a code file from a task
export const deleteTaskCodeFile = async (taskId: string, fileName: string): Promise<TaskType> => {
    try {
        const token = localStorage.getItem('token');

        // First, get the file ID
        const codeFiles = await getTaskCodeFiles(taskId);
        const codeFile = codeFiles.find(file => file.fileName === fileName);

        if (!codeFile) {
            throw new Error(`Code file with name ${fileName} not found`);
        }

        const response = await axios.delete<{success: boolean, task: TaskType}>(
            `${API_URL}/api/codefiles/${codeFile._id}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.task;
    } catch (error: any) {
        console.error('Error deleting task code file:', error);
        throw error.response ? error.response.data : {message: 'Failed to delete code file, please try again later.'};
    }
};

// Function to get activities for a task
export const getTaskActivities = async (taskId: string): Promise<ActivityType[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<ActivitiesResponse>(
            `${API_URL}/api/tasks/${taskId}/activities`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.activities || [];
    } catch (error: any) {
        console.error('Error fetching task activities:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch activities, please try again later.'};
    }
};

export interface SonarAnalysisResult {
    analysisId: string;
    score: number;
    status: string;
    detailedScores?: {
        correctnessScore: number;
        securityScore: number;
        maintainabilityScore: number;
        documentationScore: number;
        cleanCodeScore: number;
        simplicityScore: number;
        rawMetrics: {
            bugs: number;
            vulnerabilities: number;
            codeSmells: number;
            duplicatedLinesDensity: number;
            complexity: number;
            commentLinesDensity: number;
            totalLines: number;
            reliabilityRating: number;
            securityRating: number;
            maintainabilityRating: number;
        }
    };
    analysisSource: string;
    timestamp: string;
    fileName?: string;
}

// Submit code for analysis
export const submitCodeForAnalysis = async (projectId: string, codeFile: CodeFileType): Promise<{success: boolean, assessmentId: string}> => {
    try {
        const token = localStorage.getItem('token');

        // Create FormData to send the file
        const formData = new FormData();

        // Create a Blob from the code string
        const blob = new Blob([codeFile.code], { type: 'text/plain' });

        // Append the file to the FormData
        formData.append('codeFile', blob, codeFile.fileName);

        const response = await axios.post(
            `${API_URL}/api/code-review/${projectId}/analyze`,
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
            assessmentId: response.data.assessment.id
        };
    } catch (error: any) {
        console.error('Error submitting code for analysis:', error);
        throw error.response ? error.response.data : {message: 'Failed to submit code for analysis, please try again later.'};
    }
};

// Check analysis status
export const checkAnalysisStatus = async (assessmentId: string): Promise<SonarAnalysisResult> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/code-review/assessment/${assessmentId}/status`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return {
            analysisId: response.data.assessment.id,
            score: response.data.assessment.score,
            status: response.data.assessment.status,
            analysisSource: response.data.assessment.analysisSource,
            timestamp: new Date().toISOString(),
            fileName: response.data.assessment.fileType
        };
    } catch (error: any) {
        console.error('Error checking analysis status:', error);
        throw error.response ? error.response.data : {message: 'Failed to check analysis status, please try again later.'};
    }
};

// Get detailed assessment results
export const getAnalysisDetails = async (assessmentId: string): Promise<SonarAnalysisResult> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/code-review/assessment/${assessmentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        const assessment = response.data.assessment;

        return {
            analysisId: assessment._id,
            score: assessment.score,
            status: assessment.status,
            detailedScores: assessment.detailedScores,
            analysisSource: assessment.analysisSource,
            timestamp: assessment.updatedAt || assessment.createdAt,
            fileName: assessment.fileName
        };
    } catch (error: any) {
        console.error('Error getting analysis details:', error);
        throw error.response ? error.response.data : {message: 'Failed to get analysis details, please try again later.'};
    }
};

// Get all assessments for a project
export const getProjectCodeAssessments = async (projectId: string): Promise<SonarAnalysisResult[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get(
            `${API_URL}/api/code-review/${projectId}/assessments`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.assessments.map((assessment: any) => ({
            analysisId: assessment._id,
            score: assessment.score,
            status: assessment.status,
            detailedScores: assessment.detailedScores,
            analysisSource: assessment.analysisSource,
            timestamp: assessment.updatedAt || assessment.createdAt,
            fileName: assessment.fileName
        }));
    } catch (error: any) {
        console.error('Error getting project code assessments:', error);
        throw error.response ? error.response.data : {message: 'Failed to get project code assessments, please try again later.'};
    }
};

// Function to get tasks assigned to the current user
export const getTasksAssignedToCurrentUser = async (): Promise<TaskType[]> => {
    try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!userId) {
            throw new Error('User ID not found in localStorage');
        }

        const response = await axios.get<TasksResponse>(
            `${API_URL}/project/by-student/${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data.tasks || [];
    } catch (error: any) {
        console.error('Error fetching tasks assigned to current user:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch assigned tasks, please try again later.'};
    }
};
