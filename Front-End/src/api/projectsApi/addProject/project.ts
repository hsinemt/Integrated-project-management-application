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
    keywords: string[];
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
    status?: 'Not Started' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
    speciality?: 'Twin' | 'ERP/BI' | 'AI' | 'SAE' | 'SE' | 'SIM' | 'NIDS' | 'SLEAM' | 'GAMIX' | 'WIN' | 'IoSyS' | 'ArcTic';
    projectLogo?: string;
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
    keywords: [] as string[],
    difficulty: "Medium",
    status: "Not Started",
    speciality: "Twin"
};

// New function to generate project from prompt
export const generateProjectFromPrompt = async (prompt: string): Promise<ProjectType> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post<{
            success: boolean;
            message: string;
            projectDetails: ProjectType;
        }>(
            `${API_URL}/nlp/generate-from-prompt`,
            { prompt },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        if (response.data.success) {
            return response.data.projectDetails;
        } else {
            throw new Error(response.data.message || 'Failed to generate project');
        }
    } catch (error: any) {
        console.error('Error generating project from prompt:', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Failed to generate project from prompt, please try again later.' };
        }
    }
};

export const addProject = async (projectData: ProjectType, logoFile?: File): Promise<ApiResponse<ProjectType>> => {
    try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        if (!userId) {
            throw new Error("User authentication required. Please log in again.");
        }

        if (logoFile) {
            const formData = new FormData();
            formData.append('title', projectData.title);
            formData.append('description', projectData.description);

            if (Array.isArray(projectData.keywords)) {
                formData.append('keywords', JSON.stringify(projectData.keywords));
            } else {
                formData.append('keywords', JSON.stringify([]));
            }

            formData.append('difficulty', projectData.difficulty || 'Medium');
            formData.append('status', projectData.status || 'Not Started');
            formData.append('speciality', projectData.speciality || 'Twin');
            formData.append('projectLogo', logoFile);
            formData.append('userId', userId);

            const response = await axios.post<ApiResponse<ProjectType>>(
                `${API_URL}/project/create`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    withCredentials: true
                }
            );
            return response.data;
        } else {
            const requestBody = {
                title: projectData.title,
                description: projectData.description,
                keywords: projectData.keywords,
                difficulty: projectData.difficulty || 'Medium',
                status: projectData.status || 'Not Started',
                speciality: projectData.speciality || 'Twin',
                userId: userId
            };

            const response = await axios.post<ApiResponse<ProjectType>>(
                `${API_URL}/project/create`,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );
            return response.data;
        }
    } catch (error: any) {
        console.error('Failed to add project', error);

        if (error.response) {
            console.error('Server response:', error.response.data);
            console.error('Status code:', error.response.status);
            throw error.response.data;
        } else if (error.request) {
            console.error('No response received:', error.request);
            throw { message: 'No response from server. Please check your connection.' };
        } else {
            console.error('Error details:', error.message);
            throw { message: 'Failed to add project, please try again later.' };
        }
    }
};

// Create project from AI-generated details
export const createProjectFromPrompt = async (prompt: string, speciality?: string, difficulty?: string): Promise<ApiResponse<ProjectType>> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post<{
            success: boolean;
            message: string;
            project: ProjectType;
        }>(
            `${API_URL}/nlp/create-project-from-prompt`,
            {
                prompt,
                speciality,
                difficulty
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            }
        );

        if (response.data.success) {
            return {
                success: true,
                message: response.data.message,
                data: response.data.project
            };
        } else {
            throw new Error(response.data.message || 'Failed to create project from prompt');
        }
    } catch (error: any) {
        console.error('Error creating project from prompt:', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Failed to create project from prompt, please try again later.' };
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
        const response = await axios.get<{ success: boolean, project: ProjectType }>(`${API_URL}/project/getProjectById/${id}`, {
            withCredentials: true
        });
        return response.data.project;
    } catch (error: any) {
        console.error(`Error fetching project with ID ${id}:`, error);
        throw error.response ? error.response.data : {message: 'Failed to fetch project, please try again later.'};
    }
};

export const updateProject = async (id: string, projectData: ProjectType, logoFile?: File): Promise<ApiResponse<ProjectType>> => {
    try {
        const token = localStorage.getItem('token');

        const userId = localStorage.getItem("userId");

        if (!userId) {
            throw new Error("User authentication required. Please log in again.");
        }

        let requestData: any;
        let headers: any = {
            'Authorization': `Bearer ${token}`
        };

        if (logoFile) {
            const formData = new FormData();
            formData.append('title', projectData.title);
            formData.append('description', projectData.description);
            formData.append('keywords', JSON.stringify(projectData.keywords));
            formData.append('difficulty', projectData.difficulty || 'Medium');
            formData.append('status', projectData.status || 'Not Started');
            formData.append('speciality', projectData.speciality || 'Twin');
            formData.append('projectLogo', logoFile);

            formData.append('userId', userId);

            requestData = formData;

        } else {
            requestData = {
                title: projectData.title,
                description: projectData.description,
                keywords: JSON.stringify(projectData.keywords),
                difficulty: projectData.difficulty,
                status: projectData.status,
                speciality: projectData.speciality,

                userId: userId
            };
            headers['Content-Type'] = 'application/json';
        }

        const response = await axios.put<ApiResponse<ProjectType>>(
            `${API_URL}/project/update/${id}`,
            requestData,
            {
                headers: headers,
                withCredentials: true
            }
        );
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