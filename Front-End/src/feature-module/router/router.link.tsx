import { Navigate, Route } from "react-router";
import { all_routes } from "./all_routes";
import React from "react";
import RootRedirect from "./RootRedirect";
import RoleProtectedRoute from "./RoleProtectedRoute";
import ComingSoon from "../pages/comingSoon";
import Error404 from "../pages/error";
import Error500 from "../pages/error/error-500";
import UnderMaintenance from "../pages/underMaintenance";
import Profilesettings from "../settings/generalSettings/profile-settings";
import ConnectedApps from "../settings/generalSettings/connected-apps";
import Profile from "../pages/profile";
import LockScreen from "../auth/lockScreen";
import EmployeeDashboard from "../mainMenu/employeeDashboard/employee-dashboard";
import StarterPage from "../pages/starter";
import SearchResult from "../pages/search-result";
import ApiKeys from "../pages/api-keys";
import UnderConstruction from "../pages/underConstruction";
import Gallery from "../pages/gallery";
import Assets from "../administration/asset";
import Chat from "../application/chat";
import AssetsCategory from "../administration/asset-category";
import Users from "../administration/user-management/users";
import RolesPermission from "../administration/user-management/rolePermission";
import SuperAdminDashboard from "../super-admin/dashboard";
import PermissionPage from "../administration/user-management/permissionpage";
import ProjectDetails from "../projects/project/projectdetails";
import ProjectList from "../projects/project/projectlist";
import Task from "../projects/task/task";
import TaskDetails from "../projects/task/taskdetails";
import Todo from "../application/todo/todo";
import Companies from "../super-admin/companies";
import Subscription from "../super-admin/subscription";
import Packages from "../super-admin/packages/packagelist";
import PackageGrid from "../super-admin/packages/packagelist";
import Domain from "../super-admin/domin";
import PurchaseTransaction from "../super-admin/purchase-transaction";
import ProjectsPage from "../administration/user-management/projects";
import MotivationsTable from "../administration/user-management/motivations";
import AddGroupForm from "../mainMenu/student/addgroupe";

// Lazy loaded authentication components
const Login = React.lazy(() => import("../auth/login/login"));
const Register = React.lazy(() => import("../auth/register/register"));
const TwoStepVerification = React.lazy(() => import("../auth/twoStepVerification/twoStepVerification"));
const EmailVerification = React.lazy(() => import("../auth/emailVerification/emailVerification"));
const ResetPassword = React.lazy(() => import("../auth/resetPassword/resetPassword"));
const ForgotPassword = React.lazy(() => import("../auth/forgotPassword/forgotPassword"));

// Lazy loaded admin dashboard
const AdminDashboard = React.lazy(() => import("../mainMenu/adminDashboard"));

// Lazy loaded additional authentication components
const Login2 = React.lazy(() => import("../auth/login/login-2"));
const Login3 = React.lazy(() => import("../auth/login/login-3"));
const ResetPassword2 = React.lazy(() => import("../auth/resetPassword/resetPassword-2"));
const ResetPassword3 = React.lazy(() => import("../auth/resetPassword/resetPassword-3"));
const TwoStepVerification2 = React.lazy(() => import("../auth/twoStepVerification/twoStepVerification-2"));
const TwoStepVerification3 = React.lazy(() => import("../auth/twoStepVerification/twoStepVerification-3"));
const Register2 = React.lazy(() => import("../auth/register/register-2"));
const Register3 = React.lazy(() => import("../auth/register/register-3"));
const ForgotPassword2 = React.lazy(() => import("../auth/forgotPassword/forgotPassword-2"));
const ForgotPassword3 = React.lazy(() => import("../auth/forgotPassword/forgotPassword-3"));
const ResetPasswordSuccess = React.lazy(() => import("../auth/resetPasswordSuccess/resetPasswordSuccess"));
const ResetPasswordSuccess2 = React.lazy(() => import("../auth/resetPasswordSuccess/resetPasswordSuccess-2"));
const ResetPasswordSuccess3 = React.lazy(() => import("../auth/resetPasswordSuccess/resetPasswordSuccess-3"));

// Lazy load email verification components
const EmailVerification2 = React.lazy(() => import("../auth/emailVerification/emailVerification-2"));
const EmailVerification3 = React.lazy(() => import("../auth/emailVerification/emailVerification-3"));

// Lazy load deals dashboard
const DealsDashboard = React.lazy(() => import("../mainMenu/dealsDashboard"));

// Lazy load project components
const Project = React.lazy(() => import("../projects/project/project"));

// Lazy load task board
const TaskBoard = React.lazy(() => import("../projects/task/task-board"));

// Lazy load users management
const UsersManagement = React.lazy(() => import("../super-admin/users/UsersManagement"));


const routes = all_routes;

export const publicRoutes = [
  {
    path: "/",
    name: "Root",
    element: <RootRedirect />,
    route: Route,
  },
  {
    path: routes.AddGroupForm,
    element: (
      <AddGroupForm
        availableProjects={[]}  // Passez un tableau vide ici, mais vous pouvez le remplir par la suite avec l'appel API
        onSubmit={(data: { emails: string[]; selectedProjects: string[]; motivations: { [key: string]: string; }; }) => {
          // Implémentez ici ce que vous voulez faire avec les données soumises
          console.log(data);
        }}
      />
    ),
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
    path: routes.projects,
    element: <ProjectsPage />,
  },

  {
    path: routes.permissionpage,
    element: <PermissionPage />,
  },
  {
    path: routes.todo,
    element: <Todo />,
    route: Route,
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
    path: "/motivations/:projectId",
    element: <MotivationsTable />,
    route: Route,
  },

  {
    path: routes.project,
    element: <Project />,
    route: Route,
  },
  {
    path: "/project-details/:id",
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
