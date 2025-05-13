import React, { Suspense } from "react";
import {  Route, Routes } from "react-router";
import { authRoutes, publicRoutes } from "./router.link";
import Feature from "../feature";
import AuthFeature from "../authFeature";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import Error404 from "../pages/error";

const ALLRoutes: React.FC = () => {
  // Loading fallback component
  const LoadingFallback = () => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
  );

  return (
      <>
        <Routes>
          {/* Protected routes - only accessible when logged in */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Feature />}>
              {/* Admin-only routes */}
              <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                <Route
                  path="/super-admin/dashboard"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/super-admin/dashboard')?.element}
                    </Suspense>
                  }
                />
                <Route
                  path="/super-admin/users"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/super-admin/users')?.element}
                    </Suspense>
                  }
                />
              </Route>

              {/* Manager, Tutor, and Student routes */}
              <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'tutor', 'student']} />}>
                <Route
                  path="/deals-dashboard"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/deals-dashboard')?.element}
                    </Suspense>
                  }
                />

<Route
                  path="/employee-dashboard/:studentId"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/employee-dashboard/:studentId')?.element}
                    </Suspense>
                  }
                />
                <Route
                  path="/project-details/:id"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/project-details/:id')?.element}
                    </Suspense>
                  }
                />
                <Route
                  path="/motivations/:projectId"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      {publicRoutes.find(route => route.path === '/motivations/:projectId')?.element}
                    </Suspense>
                  }
                />
              </Route>

              {/* Routes accessible by all authenticated users */}
              <Route
                path="/task-board"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    {publicRoutes.find(route => route.path === '/task-board')?.element}
                  </Suspense>
                }
              />
              <Route
                path="/projects"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    {publicRoutes.find(route => route.path === '/projects')?.element}
                  </Suspense>
                }
              />

              {/* Task details route */}
              <Route
                path="/task-details/:taskId"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    {publicRoutes.find(route => route.path === '/task-details/:taskId')?.element}
                  </Suspense>
                }
              />
                <Route
                    path="/grades/:studentId/:projectId"
                    element={
                        <Suspense fallback={<LoadingFallback />}>
                            {publicRoutes.find(route => route.path === '/grades/:studentId/:projectId')?.element}
                        </Suspense>
                    }
                />

              {/* Other public routes */}
              {publicRoutes
                .filter(route => 
                  !['/super-admin/dashboard', '/super-admin/users', '/deals-dashboard', 
                    '/project-details/:id', '/motivations/:projectId', '/task-board', '/projects',
                    '/task-details/:taskId']
                    .includes(route.path)
                )
                .map((route, idx) => (
                  <Route
                    path={route.path}
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        {route.element}
                      </Suspense>
                    }
                    key={idx}
                  />
                ))
              }
            </Route>
          </Route>

          {/* Unauthorized page */}
          <Route path="/unauthorized" element={<Error404 />} />

          {/* Auth routes - accessible without login */}
          <Route element={<AuthFeature />}>
            {authRoutes.map((route, idx) => (
                <Route
                    path={route.path}
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        {route.element}
                      </Suspense>
                    }
                    key={idx}
                />
            ))}
          </Route>

        </Routes>
      </>
  );
};

export default ALLRoutes;
