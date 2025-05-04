import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

/**
 * RoleProtectedRoute component that checks if the user has the required role
 * before allowing access to the wrapped routes.
 * If not authorized, redirects to an appropriate page.
 */
const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  
  // Check if user is authenticated by looking for token in localStorage
  const isAuthenticated = !!localStorage.getItem('token');
  
  // Get user role from localStorage
  const userRole = localStorage.getItem('role');
  
  // Check if user has required role
  const hasRequiredRole = userRole && allowedRoles.includes(userRole);
  
  // If authenticated and has required role, render the child routes
  // If authenticated but doesn't have required role, redirect to unauthorized page
  // If not authenticated, redirect to login page
  if (isAuthenticated) {
    if (hasRequiredRole) {
      return <Outlet />;
    } else {
      // Redirect to unauthorized page or dashboard with state to preserve the attempted URL
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  } else {
    // Redirect to login page with state to preserve the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
};

export default RoleProtectedRoute;