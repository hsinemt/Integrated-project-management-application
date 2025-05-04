import axios from "axios";
const API_URL = 'http://localhost:9777';

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