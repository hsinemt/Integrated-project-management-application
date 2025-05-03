import axios from 'axios';

const API_URL = 'http://localhost:9777';

export const uploadUserPhoto = async (file: File, userId?: string) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const formData = new FormData();
        formData.append('image', file);

        if (userId) {
            formData.append('userId', userId);
        }

        const response = await axios.post(`${API_URL}/user/upload-photo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading user photo:', error);
        throw error;
    }
};

export const createUserWithPhoto = async (
    file: File | null,
    userData: any,
    userType: 'manager' | 'tutor' | 'student'
) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const formData = new FormData();

        Object.keys(userData).forEach(key => {
            if (key === 'skills' && Array.isArray(userData[key])) {
                formData.append(key, JSON.stringify(userData[key]));
            } else {
                formData.append(key, userData[key]);
            }
        });

        if (file) {
            formData.append('photo', file);
        }

        const endpoint = `/user/add${userType.charAt(0).toUpperCase() + userType.slice(1)}WithPhoto`;

        const response = await axios.post(`${API_URL}${endpoint}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Error creating ${userType} with photo:`, error);
        throw error;
    }
};


export const updateUserWithPhoto = async (
    userId: string,
    userData: any,
    file: File | null
) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const formData = new FormData();

        Object.keys(userData).forEach(key => {
            if (userData[key] !== undefined) {
                if (key === 'skills' && Array.isArray(userData[key])) {
                    formData.append(key, JSON.stringify(userData[key]));
                } else {
                    formData.append(key, userData[key]);
                }
            }
        });

        if (file) {
            formData.append('photo', file);
        }

        const response = await axios.put(`${API_URL}/user/update-with-photo/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error updating user with photo:', error);
        throw error;
    }
};