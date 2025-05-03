import axios from "axios";

const API_URL = 'http://localhost:9777';

export const initialRegisterFormData = {
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    photo: null as File | null,
    photoPreview: "",
};

export const registerUser = async (userData: any) => {
    try {
        // If photo is provided, use the signupWithPhoto endpoint
        if (userData.photo) {
            return await registerUserWithPhoto(userData);
        }

        // Otherwise use the regular signup endpoint
        const response = await axios.post(`${API_URL}/user/signup`, {
            name: userData.name,
            lastname: userData.lastName,
            email: userData.email,
            password: userData.password,
            role: 'student'
        });

        if (response.data.success) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("userEmail", userData.email);
            if (response.data.user?.avatar) {
                localStorage.setItem("userAvatar", response.data.user.avatar);
            }
        }
        return response.data;
    } catch (error: any) {
        console.error('Registration failed', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw error.response ? error.response.data : {message: 'Registration failed, please try again later.'};
        }
    }
};

export const registerUserWithPhoto = async (userData: any) => {
    try {
        const formData = new FormData();
        formData.append('name', userData.name);
        formData.append('lastname', userData.lastName);
        formData.append('email', userData.email);
        formData.append('password', userData.password);

        // Don't set role here, let the server handle it
        // formData.append('role', 'student');

        if (userData.photo) {
            formData.append('photo', userData.photo);
        }

        console.log('Sending form data:', {
            name: userData.name,
            lastname: userData.lastName,
            email: userData.email,
            password: '********', // Don't log actual password
            hasPhoto: !!userData.photo
        });

        const response = await axios.post(`${API_URL}/user/signupWithPhoto`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.data.success) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("userEmail", userData.email);
            if (response.data.user?.avatar) {
                localStorage.setItem("userAvatar", response.data.user.avatar);
            }
        }
        return response.data;
    } catch (error: any) {
        console.error('Registration with photo failed', error);
        // More detailed error logging
        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            throw error.response.data;
        } else if (error.request) {
            console.error('Error request:', error.request);
            throw {message: 'No response received from server. Please try again later.'};
        } else {
            console.error('Error message:', error.message);
            throw {message: 'Registration failed, please try again later.'};
        }
    }
};
