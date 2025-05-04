import axios from "axios";

const API_URL = 'http://localhost:9777';

export const initialRegisterFormData = {
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
};

export const registerUser = async (userData: any) => {
    try {
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
