import axios from 'axios';
import { API_URL, getFullAvatarUrl } from '../config';

export type users_type = {
    _id?: string;
    name: string;
    lastname: string;
    email: string;
    role: string;
    avatar?: string;
    Status?: string;
    speciality?: string;
    projects?: Array<{
        _id?: string;
        speciality?: string;
        [key: string]: any;
    }>;
}

export type SpecialtyData = {
    specialty: string;
    count: number;
    percentage: number;
}

export type StudentsBySpecialtyResponse = {
    success: boolean;
    totalStudents: number;
    specialties: SpecialtyData[];
}

export const fetchUsers = async (): Promise<users_type[]> => {
    try {
        const response = await axios.get(`${API_URL}/user/getUsers`);

        // Process avatar URLs before returning the data
        const users = response.data.map((user: users_type) => ({
            ...user,
            // Process avatar URL if it exists
            avatar: user.avatar ? getFullAvatarUrl(user.avatar) : undefined,
            Status: 'Active'
        }));

        return users;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

export const updateUser = async (userId: string, userData: any) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await axios.put(`${API_URL}/user/update/${userId}`, userData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

export const deleteUser = async (userId: string) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await axios.delete(`${API_URL}/user/delete/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

export const fetchStudentsBySpecialty = async (): Promise<StudentsBySpecialtyResponse> => {
    try {
        const response = await axios.get(`${API_URL}/user/students-by-specialty`);
        return response.data;
    } catch (error) {
        console.error("Error fetching students by specialty:", error);
        throw error;
    }
};
