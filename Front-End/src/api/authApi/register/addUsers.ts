import axios from "axios";

const API_URL = 'http://localhost:9777';

export const initialTutorFormData = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    classe: "",
    userId: "",
    role: "Tutor",
};

export const initialManagerFormData = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    speciality: "",
    userId: "",
};

export const initialStudentFormData = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    speciality: "",
    skills: [],
    level: "",
    userId: "",
};


export const addTutor = async (tutorData: any) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No token found. Please log in again.");
        }
        const response = await axios.post(`${API_URL}/user/addTutor`, {
            name: tutorData.name,
            lastname: tutorData.lastname,
            email: tutorData.email,
            password: tutorData.password,
            classe: tutorData.classe,
            userId: tutorData.userId,
            role: "tutor",
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.data.success) {
            console.log("Tutor added successfully:", response.data);
            if (response.data.user?.avatar) {
                console.log("Tutor avatar:", response.data.user.avatar);
            }
        }
        return response.data;
    } catch (error: any) {
        console.error('Failed to add tutor', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Failed to add tutor, please try again later.' };
        }
    }
};

export const addManager = async (managerData: any) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No token found. Please log in again.");
        }

        const response = await axios.post(`${API_URL}/user/addManager`, {
            name: managerData.name,
            lastname: managerData.lastname,
            email: managerData.email,
            password: managerData.password,
            speciality: managerData.speciality,
            userId: managerData.userId,
            role:"Manager",
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.data.success) {
            console.log("Manager added successfully:", response.data);
            if (response.data.user?.avatar) {
                console.log("Manager avatar:", response.data.user.avatar);
            }
        }
        return response.data;
    } catch (error: any) {
        console.error('Failed to add manager', error);
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        throw error.response?.data || { message: 'Failed to add manager, please try again later.' };
    }
};

export const addStudent = async (studentData: any) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No token found. Please log in again.");
        }

        const skills = Array.isArray(studentData.skills) ? studentData.skills : [];

        const response = await axios.post(`${API_URL}/user/addStudent`, {
            name: studentData.name,
            lastname: studentData.lastname,
            email: studentData.email,
            password: studentData.password,
            speciality: studentData.speciality,
            skills: skills,
            level: studentData.level,
            userId: studentData.userId,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.data.success) {
            console.log("Student added successfully:", response.data);
            if (response.data.user?.avatar) {
                console.log("Student avatar:", response.data.user.avatar);
            }
        }
        return response.data;
    } catch (error: any) {
        console.error('Failed to add student', error);
        if (error.response) {
            throw error.response.data;
        } else {
            throw { message: 'Failed to add student, please try again later.' };
        }
    }
};