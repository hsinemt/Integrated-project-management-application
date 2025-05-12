import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to check if a student is already in a group
 * @returns An object containing isInGroup status and loading state
 */
const useStudentGroupStatus = () => {
  const [isInGroup, setIsInGroup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStudentGroupStatus = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          setError('User ID not found');
          setLoading(false);
          return;
        }

        const response = await axios.get(`http://localhost:9777/choix/check-student?studentId=${userId}`);
        setIsInGroup(response.data.isInGroup);
        setLoading(false);
      } catch (err) {
        console.error('Error checking student group status:', err);
        setError('Failed to check group status');
        setLoading(false);
      }
    };

    checkStudentGroupStatus();
  }, []);

  return { isInGroup, loading, error };
};

export default useStudentGroupStatus;