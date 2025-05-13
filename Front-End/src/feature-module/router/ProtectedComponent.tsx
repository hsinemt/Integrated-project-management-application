import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedComponentProps {
  allowedRoles: string[];
  component: React.ReactNode;
}

/**
 * ProtectedComponent that checks if the user has the required role
 * before rendering the component.
 * If not authorized, redirects to an appropriate page.
 */
const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ allowedRoles, component }) => {
  const location = useLocation();

  // Check if user is authenticated by looking for token in localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  // Get user role from localStorage
  const userRole = localStorage.getItem('role');

  // Check if user has required role
  const hasRequiredRole = userRole && allowedRoles.includes(userRole);

  // If authenticated and has required role, render the component
  // If authenticated but doesn't have required role, redirect to unauthorized page
  // If not authenticated, redirect to login page
  if (isAuthenticated) {
    if (hasRequiredRole) {
      return <>{component}</>;
    } else {
      // Redirect to unauthorized page with state to preserve the attempted URL
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  } else {
    // Redirect to login page with state to preserve the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
};

export default ProtectedComponent;
