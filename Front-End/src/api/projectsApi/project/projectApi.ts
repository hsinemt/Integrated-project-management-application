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

export interface TutorType {
    _id: string;
    name: string;
    lastname: string;
    email: string;
    classe: string;
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
    projectAvatar?: string;
    creator?: CreatorType;
    assignedTutor?: TutorType;
    tutors?: string[];
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

export interface TutorResponse {
    success: boolean;
    tutors: TutorType[];
    count: number;
}

export const initialProjectData: ProjectType = {
    title: "",
    description: "",
    keywords: [] as string[],
    difficulty: "Medium",
    status: "Not Started",
    speciality: "Twin"
};


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
            formData.append('projectAvatar', logoFile);
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

export interface ProjectsBySpecialityResponse {
    success: boolean;
    count: number;
    speciality: string;
    projects: ProjectType[];
    viewType: 'all' | 'group' | 'assigned';
    inGroup?: boolean;
    hasAssignedProjects?: boolean;
    groupNames?: string[];
}

export const getProjectsByUserSpeciality = async (): Promise<{
    projects: ProjectType[], 
    speciality: string,
    viewType: 'all' | 'group' | 'assigned',
    inGroup?: boolean,
    hasAssignedProjects?: boolean,
    groupNames?: string[]
}> => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get<ProjectsBySpecialityResponse>(`${API_URL}/project/getProjectsByUserSpeciality`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return {
            projects: response.data.projects,
            speciality: response.data.speciality,
            viewType: response.data.viewType,
            inGroup: response.data.inGroup,
            hasAssignedProjects: response.data.hasAssignedProjects,
            groupNames: response.data.groupNames
        };
    } catch (error: any) {
        console.error('Error fetching projects by speciality:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch projects by speciality, please try again later.'};
    }
};

export const getProjectById = async (id: string): Promise<ProjectType> => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get<{ success: boolean, project: ProjectType }>(`${API_URL}/project/getProjectById/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
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
            formData.append('projectAvatar', logoFile);

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
        const token = localStorage.getItem('token');
        const response = await axios.get<{success: boolean, count: number}>(`${API_URL}/project/count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return response.data.count;
    } catch (error: any) {
        console.error('Error fetching projects count:', error);
        return 0;
    }
};


export const getAllTutors = async (): Promise<TutorType[]> => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get<any>(`${API_URL}/user/getUsers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });

        // Filter users to only include tutors and map to TutorType format
        const tutors = response.data
            .filter((user: any) => user.role === 'tutor')
            .map((tutor: any) => ({
                _id: tutor._id,
                name: tutor.name,
                lastname: tutor.lastname,
                email: tutor.email,
                classe: tutor.classe || '',
                avatar: tutor.avatar || ''
            }));

        return tutors;
    } catch (error: any) {
        console.error('Error fetching tutors:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch tutors, please try again later.'};
    }
};

export const assignTutorToProject = async (projectId: string, tutorId: string): Promise<ApiResponse<ProjectType>> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.put<ApiResponse<ProjectType>>(
            `${API_URL}/project/assign-tutor/${projectId}`,
            { tutorId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Failed to assign tutor to project', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw {message: 'Failed to assign tutor to project, please try again later.'};
        }
    }
};

export interface GroupType {
    _id: string;
    nom_groupe: string;
    id_students: {
        _id: string;
        name: string;
        lastname: string;
        email: string;
    }[];
    id_tutor: {
        _id: string;
        name: string;
        lastname: string;
        email: string;
    } | null;
    id_project: {
        _id: string;
        title: string;
    } | null;
}

export interface GroupsResponse {
    success: boolean;
    groups: GroupType[];
}

// This function is kept for backward compatibility but will be replaced with client-side filtering
export const getGroupsByProjectId = async (projectId: string): Promise<GroupType[]> => {
    console.warn('getGroupsByProjectId is deprecated - endpoint does not exist in backend');
    console.warn('Using client-side filtering instead in the component');

    // Return empty array since the endpoint doesn't exist
    return [];

    // Original implementation kept for reference:
    /*
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get<GroupsResponse>(`${API_URL}/groups/by-project/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });
        return response.data.groups || [];
    } catch (error: any) {
        console.error('Error fetching groups by project ID:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch groups, please try again later.'};
    }
    */
};

/**
 * Fetches groups where the specified user is the tutor
 * 
 * This function uses the /group/by-user/:userId endpoint which returns groups where the user
 * is either a student or a tutor, and then filters the results to only include groups
 * where the user is the tutor.
 * 
 * @param tutorId - The ID of the tutor to fetch groups for
 * @returns Promise resolving to an array of GroupType objects where the user is the tutor
 */
export const getGroupsByTutorId = async (tutorId: string): Promise<GroupType[]> => {
    try {
        const token = localStorage.getItem('token');
        // Use the existing endpoint that returns groups where the user is either a student or a tutor
        const response = await axios.get<GroupsResponse>(`${API_URL}/group/by-user/${tutorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        });

        // Log the raw response for debugging
        console.log(`Raw response from /group/by-user/${tutorId}:`, response.data);

        if (!response.data.groups || response.data.groups.length === 0) {
            console.warn(`No groups found for user ${tutorId} in the response`);
            return [];
        }

        // Filter to only include groups where the user is the tutor
        const tutorGroups = response.data.groups.filter(group => {
            // Check if id_tutor exists and matches the tutorId
            const isTutor = group.id_tutor && group.id_tutor._id === tutorId;
            if (!isTutor) {
                console.log(`Group ${group._id} has tutor ${group.id_tutor?._id} which doesn't match ${tutorId}`);
            }
            return isTutor;
        }) || [];

        console.log(`Found ${tutorGroups.length} groups where user ${tutorId} is the tutor`);
        return tutorGroups;
    } catch (error: any) {
        console.error('Error fetching groups by tutor ID:', error);
        throw error.response ? error.response.data : {message: 'Failed to fetch groups, please try again later.'};
    }
};
