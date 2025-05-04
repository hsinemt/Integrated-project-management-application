import React from "react";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { Link, useLocation } from "react-router-dom";
import { all_routes } from "../../router/all_routes";

const Error404 = () => {
  const routes = all_routes;
  const location = useLocation();

  // Check if this is an unauthorized access (403) or a not found (404) error
  const isUnauthorized = location.pathname === "/unauthorized";

  // Get user role from localStorage for unauthorized redirects
  const userRole = localStorage.getItem('role') || 'user';

  // Determine where to redirect based on user role for unauthorized access
  const getRedirectPath = () => {
    switch (userRole) {
      case 'admin':
        return '/super-admin/dashboard';
      case 'manager':
      case 'tutor':
        return '/task-board';
      case 'student':
        return '/task-board';
      default:
        return '/login';
    }
  };

  // Set the appropriate title, message, and redirect path based on error type
  const errorTitle = isUnauthorized ? "403" : "404";
  const errorHeading = isUnauthorized ? "ACCESS DENIED!" : "Oops, something went wrong";
  const errorMessage = isUnauthorized 
    ? "You don't have permission to access this page. Please contact your administrator if you believe this is an error."
    : "Error 404 Page not found. Sorry the page you looking for doesn't exist or has been moved";
  const redirectPath = isUnauthorized ? getRedirectPath() : routes.adminDashboard;
  const buttonText = isUnauthorized ? "Go to Dashboard" : "Back to Dashboard";
  const imageSrc = isUnauthorized ? "assets/img/bg/error-403.svg" : "assets/img/bg/error-404.svg";

  return (
    <div className={isUnauthorized ? "main-wrapper" : "container"}>
      <div className={isUnauthorized ? "error-box" : "vh-100 d-flex align-items-center"}>
        {isUnauthorized ? (
          <div className="error-body text-center">
            <h1 className="error-title">{errorTitle}</h1>
            <h3 className="text-uppercase error-subtitle">{errorHeading}</h3>
            <p className="error-text mt-4 mb-4">
              {errorMessage}
            </p>
            <Link to={redirectPath} className="btn btn-primary">
              {buttonText}
            </Link>
            <footer className="error-footer text-center mt-5">
              <p className="mb-0">© 2025 Projexus. All Rights Reserved.</p>
            </footer>
          </div>
        ) : (
          <div className="row justify-content-center align-items-center">
            <div className="col-md-4 d-flex justify-content-center align-items-center">
              <div>
                <div className="mb-5">
                  <ImageWithBasePath src="assets/img/logo.svg" alt="logo" className="img-fluid" />
                </div>
                <div>
                  <h1 className="mb-3">{errorHeading}</h1>
                  <p className="fs-16">
                    {errorMessage}
                  </p>
                  <div className="d-flex">
                    <Link
                      to={redirectPath}
                      className="btn btn-primary d-flex align-items-center"
                    >
                      <i className="ti ti-arrow-left me-2" />
                      {buttonText}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-8 d-flex justify-content-end align-items-center">
              <div className="error-images">
                <ImageWithBasePath
                  src={imageSrc}
                  alt="error image"
                  className="img-fluid"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Error404;
