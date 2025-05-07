
const API_URL = 'http://localhost:9777';

export type users_type={


    name: string;
    lastname: string;
    email: string;
    role: string;
    avatar?: string;


}
export const fetchUsers = async (): Promise<users_type[]> => {
    try {
        const response = await fetch(`http://localhost:9777/user/getUsers`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        // console.log("Fetched Users:", data);
        // console.log("data size be like : "+data.length);
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};