import axios from "axios";

const API_URL = 'http://localhost:9777';

export const loginUser = async (loginData: { email: string; password: string }) => {
    try {
        const response = await axios.post(`${API_URL}/user/login`, {
            email: loginData.email,
            password: loginData.password,
        });

        if (response.data.success) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("userEmail", loginData.email);
        }

        return response.data;
    } catch (error: any) {
        console.error('Login failed', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Login failed, please try again later.' };
        }
    }
};