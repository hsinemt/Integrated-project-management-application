import axios from "axios";

const API_URL = 'http://localhost:9777';

export const sendVerifyOtp = async (email: string) => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post(`${API_URL}/user/sendVerifyOtp`,
            { email },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                withCredentials: true
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Failed to send OTP', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Failed to send OTP, please try again later.' };
        }
    }
};
