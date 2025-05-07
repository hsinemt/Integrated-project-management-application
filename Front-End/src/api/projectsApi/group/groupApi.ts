import axios from "axios";
const API_URL = 'http://localhost:9777';

export interface StudentType {
    _id: string;
    name: string;
    email: string;
}

export interface TutorType {
    _id: string;
    name: string;
    email: string;
}

export interface GroupType {
    _id: string;
    nom_groupe: string;
    id_students: StudentType[] | string[]; // Can be array of strings or StudentType objects
    id_tutor: TutorType | string | null;
    id_project: string | null;
}

export interface GroupsResponse {
    success: boolean;
    groups: GroupType[];
}

// Function to get groups by project ID
export const getGroupsByProjectId = async (projectId: string): Promise<GroupType[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<GroupType[]>(
            `${API_URL}/group/by-project/${projectId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data || [];
    } catch (error: any) {
        console.error('Error fetching groups for project:', error);
        return [];
    }
};

// Function to get all groups
export const getAllGroups = async (): Promise<GroupType[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.get<GroupType[]>(
            `${API_URL}/group/all`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            }
        );

        return response.data || [];
    } catch (error: any) {
        console.error('Error fetching all groups:', error);
        return [];
    }
};

// Function to count students in a group
export const countStudentsInGroup = (group: GroupType): number => {
    if (!group.id_students) {
        return 0;
    }

    return group.id_students.length;
};