import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute component that checks if the user is authenticated
 * before allowing access to the wrapped routes.
 * If not authenticated, redirects to the login page.
 */
const ProtectedRoute: React.FC = () => {
  // Check if user is authenticated by looking for token in localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  // If authenticated, render the child routes
  // If not, redirect to login page
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;