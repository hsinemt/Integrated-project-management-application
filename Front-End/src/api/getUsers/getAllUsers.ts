import axios from 'axios';

const API_URL = 'http://localhost:9777';

export type users_type = {
    _id?: string;
    name: string;
    lastname: string;
    email: string;
    role: string;
    avatar?: string;
    Status?: string;
}

export const fetchUsers = async (): Promise<users_type[]> => {
    try {
        const response = await axios.get(`${API_URL}/user/getUsers`);
        return response.data;
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