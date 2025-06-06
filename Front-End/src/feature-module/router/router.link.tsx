import { Navigate, Route } from "react-router";
import { all_routes } from "./all_routes";
import ComingSoon from "../pages/comingSoon";
import Login from "../auth/login/login";
import Register from "../auth/register/register";
import TwoStepVerification from "../auth/twoStepVerification/twoStepVerification";
import EmailVerification from "../auth/emailVerification/emailVerification";
import ResetPassword from "../auth/resetPassword/resetPassword";
import ForgotPassword from "../auth/forgotPassword/forgotPassword";

import Error404 from "../pages/error/error-404";
import Error500 from "../pages/error/error-500";
import UnderMaintenance from "../pages/underMaintenance";

import AdminDashboard from "../mainMenu/adminDashboard";


import Login2 from "../auth/login/login-2";
import Login3 from "../auth/login/login-3";
import ResetPassword2 from "../auth/resetPassword/resetPassword-2";
import ResetPassword3 from "../auth/resetPassword/resetPassword-3";
import TwoStepVerification2 from "../auth/twoStepVerification/twoStepVerification-2";
import TwoStepVerification3 from "../auth/twoStepVerification/twoStepVerification-3";
import Register2 from "../auth/register/register-2";
import Register3 from "../auth/register/register-3";
import ForgotPassword2 from "../auth/forgotPassword/forgotPassword-2";
import ForgotPassword3 from "../auth/forgotPassword/forgotPassword-3";
import ResetPasswordSuccess from "../auth/resetPasswordSuccess/resetPasswordSuccess";
import ResetPasswordSuccess2 from "../auth/resetPasswordSuccess/resetPasswordSuccess-2";
import ResetPasswordSuccess3 from "../auth/resetPasswordSuccess/resetPasswordSuccess-3";
import Profilesettings from "../settings/generalSettings/profile-settings";
import ConnectedApps from "../settings/generalSettings/connected-apps";
import Profile from "../pages/profile";
import LockScreen from "../auth/lockScreen";
import EmailVerification2 from "../auth/emailVerification/emailVerification-2";
import EmailVerification3 from "../auth/emailVerification/emailVerification-3";
import EmployeeDashboard from "../mainMenu/employeeDashboard/employee-dashboard";
import DealsDashboard from "../mainMenu/dealsDashboard";

import StarterPage from "../pages/starter";
import SearchResult from "../pages/search-result";
import ApiKeys from "../pages/api-keys";
import UnderConstruction from "../pages/underConstruction";
import Gallery from "../pages/gallery";
import Assets from "../administration/asset";
import AssetsCategory from "../administration/asset-category";

import Users from "../administration/user-management/users";
import RolesPermission from "../administration/user-management/rolePermission";
import SuperAdminDashboard from "../super-admin/dashboard";

import PermissionPage from "../administration/user-management/permissionpage";

import Project from "../projects/project/project";
import ProjectDetails from "../projects/project/projectdetails";
import ProjectList from "../projects/project/projectlist";
import Task from "../projects/task/task";
import TaskDetails from "../projects/task/taskdetails";
import TaskBoard from "../projects/task/task-board";
import Companies from "../super-admin/companies";
import usersManagement from "../super-admin/users/UsersManagement";

import Subscription from "../super-admin/subscription";
import Packages from "../super-admin/packages/packagelist";
import PackageGrid from "../super-admin/packages/packagelist";
import Domain from "../super-admin/domin";
import PurchaseTransaction from "../super-admin/purchase-transaction";
import React from "react";
import UsersManagement from "../super-admin/users/UsersManagement";

const routes = all_routes;

export const publicRoutes = [
  {
    path: "/",
    name: "Root",
    element: <Navigate to="/login" />,
    route: Route,
  },
  {
    path: routes.adminDashboard,
    element: <AdminDashboard />,
    route: Route,
  },
  {
    path: routes.employeeDashboard,
    element: <EmployeeDashboard />,
    route: Route,
  },
  {
    path: routes.dealsDashboard,
    element: <DealsDashboard />,
    route: Route,
  },
  {
    path: routes.starter,
    element: <StarterPage />,
    route: Route,
  },

  {
    path: routes.superAdminDashboard,
    element: <SuperAdminDashboard />,
    route: Route,
  },

  //Settings

  {
    path: routes.profilesettings,
    element: <Profilesettings />,
  },

  {
    path: routes.connectedApps,
    element: <ConnectedApps />,
  },



  {
    path: routes.permissionpage,
    element: <PermissionPage />,
  },



  {
    path: routes.profile,
    element: <Profile />,
  },
  {
    path: routes.gallery,
    element: <Gallery />,
  },
  {
    path: routes.searchresult,
    element: <SearchResult />,
  },

  {
    path: routes.apikey,
    element: <ApiKeys />,
  },


  {
    path: routes.assetList,
    element: <Assets />,
  },
  {
    path: routes.assetCategories,
    element: <AssetsCategory />,
  },

  {
    path: routes.users,
    element: <Users />,
  },
  {
    path: routes.rolePermission,
    element: <RolesPermission />,
  },


  {
    path: routes.project,
    element: <Project />,
    route: Route,
  },
  {
    path: routes.projectdetails,
    element: <ProjectDetails />,
    route: Route,
  },
  {
    path: routes.projectlist,
    element: <ProjectList />,
    route: Route,
  },
  {
    path: routes.tasks,
    element: <Task />,
    route: Route,
  },
  {
    path: routes.tasksdetails,
    element: <TaskDetails />,
    route: Route,
  },
  {
    path: routes.taskboard,
    element: <TaskBoard />,
    route: Route,
  },
  {
    path: routes.usersDashboard,
    element: <UsersManagement />,
    route: Route,
  },
  {
    path: routes.superAdminCompanies,
    element: <Companies />,
    route: Route,
  },
  {
    path: routes.superAdminSubscriptions,
    element: <Subscription />,
    route: Route,
  },
  {
    path: routes.superAdminPackages,
    element: <Packages />,
    route: Route,
  },
  {
    path: routes.superAdminPackagesGrid,
    element: <PackageGrid />,
    route: Route,
  },
  {
    path: routes.superAdminDomain,
    element: <Domain />,
    route: Route,
  },
  {
    path: routes.superAdminPurchaseTransaction,
    element: <PurchaseTransaction />,
    route: Route,
  },
];

export const authRoutes = [
  {
    path: routes.comingSoon,
    element: <ComingSoon />,
    route: Route,
  },
  {
    path: routes.login,
    element: <Login />,
    route: Route,
  },
  {
    path: routes.login2,
    element: <Login2 />,
    route: Route,
  },
  {
    path: routes.login3,
    element: <Login3 />,
    route: Route,
  },
  {
    path: routes.register,
    element: <Register />,
    route: Route,
  },
  {
    path: routes.twoStepVerification,
    element: <TwoStepVerification />,
    route: Route,
  },
  {
    path: routes.twoStepVerification2,
    element: <TwoStepVerification2 />,
    route: Route,
  },
  {
    path: routes.twoStepVerification3,
    element: <TwoStepVerification3 />,
    route: Route,
  },
  {
    path: routes.emailVerification,
    element: <EmailVerification />,
    route: Route,
  },
  {
    path: routes.emailVerification2,
    element: <EmailVerification2 />,
    route: Route,
  },
  {
    path: routes.emailVerification3,
    element: <EmailVerification3 />,
    route: Route,
  },
  {
    path: routes.register,
    element: <Register />,
    route: Route,
  },
  {
    path: routes.register2,
    element: <Register2 />,
    route: Route,
  },
  {
    path: routes.register3,
    element: <Register3 />,
    route: Route,
  },
  {
    path: routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
  },
  {
    path: routes.resetPassword2,
    element: <ResetPassword2 />,
    route: Route,
  },
  {
    path: routes.resetPassword3,
    element: <ResetPassword3 />,
    route: Route,
  },
  {
    path: routes.forgotPassword,
    element: <ForgotPassword />,
    route: Route,
  },
  {
    path: routes.forgotPassword2,
    element: <ForgotPassword2 />,
    route: Route,
  },
  {
    path: routes.forgotPassword3,
    element: <ForgotPassword3 />,
    route: Route,
  },
  {
    path: routes.error404,
    element: <Error404 />,
    route: Route,
  },
  {
    path: routes.error500,
    element: <Error500 />,
    route: Route,
  },
  {
    path: routes.underMaintenance,
    element: <UnderMaintenance />,
    route: Route,
  },
  {
    path: routes.underConstruction,
    element: <UnderConstruction />,
  },
  {
    path: routes.lockScreen,
    element: <LockScreen />,
  },
  {
    path: routes.resetPasswordSuccess,
    element: <ResetPasswordSuccess />,
  },
  {
    path: routes.resetPasswordSuccess2,
    element: <ResetPasswordSuccess2 />,
  },
  {
    path: routes.resetPasswordSuccess3,
    element: <ResetPasswordSuccess3 />,
  },
];
