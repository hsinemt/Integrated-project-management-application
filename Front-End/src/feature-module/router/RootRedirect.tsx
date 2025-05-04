import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * RootRedirect component that redirects users based on their authentication status
 * - If user is authenticated, redirects to appropriate dashboard based on role
 * - If user is not authenticated, redirects to login page
 */
const RootRedirect: React.FC = () => {
  const [redirectPath, setRedirectPath] = useState<string>('/login');
  
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (token) {
      // User is authenticated, redirect based on role
      if (role === 'admin') {
        setRedirectPath('/admin-dashboard');
      } else if (role === 'superadmin') {
        setRedirectPath('/super-admin-dashboard');
      } else if (role === 'employee') {
        setRedirectPath('/employee-dashboard');
      } else {
        // Default dashboard if role is not recognized
        setRedirectPath('/deals-dashboard');
      }
    } else {
      // User is not authenticated, redirect to login
      setRedirectPath('/login');
    }
  }, []);

  return <Navigate to={redirectPath} replace />;
};

export default RootRedirect;