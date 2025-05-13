import axios from 'axios';
import { API_URL } from '../config';
import { fetchUsers, users_type } from '../getUsers/getAllUsers';

export interface DashboardStats {
  codeFilesCount: number;
  zipFilesCount: number;
  managersCount: number;
  tutorsCount: number;
}


export const getCodeFilesCount = async (): Promise<number> => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/codefiles-count`);
    return response.data.count || 0;
  } catch (error) {
    console.error("Error fetching code files count:", error);
    return 0;
  }
};


export const getZipFilesCount = async (): Promise<number> => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/zipfiles-count`);
    return response.data.count || 0;
  } catch (error) {
    console.error("Error fetching zip files count:", error);
    return 0;
  }
};


export const getManagersCount = async (): Promise<number> => {
  try {
    const users = await fetchUsers();
    const managers = users.filter(user => user.role === 'manager');
    return managers.length;
  } catch (error) {
    console.error("Error fetching managers count:", error);
    return 0;
  }
};


export const getTutorsCount = async (): Promise<number> => {
  try {

    const users = await fetchUsers();
    const tutors = users.filter(user => user.role === 'tutor');
    return tutors.length;
  } catch (error) {
    console.error("Error fetching tutors count:", error);
    return 0;
  }
};


export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {

    const users = await fetchUsers();
    const managers = users.filter(user => user.role === 'manager');
    const tutors = users.filter(user => user.role === 'tutor');

    const [codeFilesResponse, zipFilesResponse] = await Promise.all([
      axios.get(`${API_URL}/api/stats/codefiles-count`),
      axios.get(`${API_URL}/api/stats/zipfiles-count`)
    ]);
    
    return {
      codeFilesCount: codeFilesResponse.data.count || 0,
      zipFilesCount: zipFilesResponse.data.count || 0,
      managersCount: managers.length,
      tutorsCount: tutors.length
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      codeFilesCount: 0,
      zipFilesCount: 0,
      managersCount: 0,
      tutorsCount: 0
    };
  }
};