import axios from "axios";
const API_URL = 'http://localhost:9777';

export interface CreatorType {
    userId: string;
    name: string;
    lastname: string;
    email: string;
    role: string;
    avatar?: string;
}

export interface ProjectType {
    _id?: string;
    title: string;
    description: string;
    keyFeatures: string[];
    creator?: CreatorType;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface ProjectsResponse {
    success: boolean;
    projects: ProjectType[];
}

export interface ProjectResponse {
    success: boolean;
    project: ProjectType;
}

export const initialProjectData: ProjectType = {
    title: "",
    description: "",
    keyFeatures: [] as string[],
};

export const project = async (projectData: ProjectType): Promise<ApiResponse<ProjectType>> => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.post<ApiResponse<ProjectType>>(`${API_URL}/project/create`, {
            title: projectData.title,
            description: projectData.description,
            keyFeatures: projectData.keyFeatures
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return response.data;
    } catch (error: any) {
        console.error('Failed to add project', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw error.response ? error.response.data : {message: 'Failed to add project, please try again later.'};
        }
    }
};

export const getAllProjects = async (): Promise<ProjectType[]> => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get<ProjectsResponse>(`${API_URL}/project/getAllProjects`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return response.data.projects;
    } catch (error: any) {
        console.error('Error fetching projects:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch projects, please try again later.'};
    }
};

export const getProjectById = async (id: string): Promise<ProjectType> => {
    try {
        const response = await axios.get<ProjectResponse>(`${API_URL}/project/${id}`, {
            withCredentials: true
        });
        return response.data.project;
    } catch (error: any) {
        console.error(`Error fetching project with ID ${id}:`, error);
        throw error.response ? error.response.data : {message: 'Failed to fetch project, please try again later.'};
    }
};

export const updateProject = async (id: string, projectData: ProjectType): Promise<ApiResponse<ProjectType>> => {
    try {
        const response = await axios.put<ApiResponse<ProjectType>>(`${API_URL}/project/update/${id}`, {
            title: projectData.title,
            description: projectData.description,
            keyFeatures: projectData.keyFeatures
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        return response.data;
    } catch (error: any) {
        console.error('Failed to update project', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw error.response ? error.response.data : {message: 'Failed to update project, please try again later.'};
        }
    }
};

export const deleteProject = async (id: string): Promise<ApiResponse<void>> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.delete<ApiResponse<void>>(`${API_URL}/project/delete/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return response.data;
    } catch (error: any) {
        console.error('Failed to delete project', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw error.response ? error.response.data : {message: 'Failed to delete project, please try again later.'};
        }
    }
};
export const getProjectsCount = async (): Promise<number> => {
    try {
        const response = await axios.get<{success: boolean, count: number}>(`${API_URL}/project/count`, {
            withCredentials: true
        });
        return response.data.count;
    } catch (error: any) {
        console.error('Error fetching projects count:', error);
        return 0;
    }
};