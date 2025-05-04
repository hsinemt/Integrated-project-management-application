import axios from 'axios';

const API_URL = 'http://localhost:9777';

export const verifyOTP = async (userId: string, otp: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/user/verifyAccount`,
            { userId, otp },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error verifying OTP:", error);
        throw new Error("An error occurred while verifying the OTP");
    }
};