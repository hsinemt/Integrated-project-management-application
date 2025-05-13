import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { all_routes } from '../../router/all_routes';

const Unauthorized = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routes = all_routes;

  // Get user role from localStorage
  const userRole = localStorage.getItem('role');

  // Determine the appropriate dashboard based on user role
  const getRedirectPath = () => {
    switch(userRole) {
      case 'admin':
        return routes.adminDashboard;
      case 'manager':
        return routes.managerDashboard;
      case 'tutor':
        return routes.tutorDashboard;
      case 'student':
        return '/projects-grid';
      default:
        return routes.adminDashboard;
    }
  };

  const redirectPath = getRedirectPath();

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="main-wrapper">
      <div className="error-box">
        <div className="error-body text-center">
          <ImageWithBasePath src="assets/img/error-403.png" alt="Unauthorized" className="img-fluid" />
          <h3 className="text-danger">Unauthorized Access</h3>
          <p className="mb-4">
            You don't have permission to access this page. 
            This area is restricted to users with specific roles.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to={redirectPath} className="btn btn-primary">
              Go to Dashboard
            </Link>
            <button onClick={handleGoBack} className="btn btn-outline-primary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;