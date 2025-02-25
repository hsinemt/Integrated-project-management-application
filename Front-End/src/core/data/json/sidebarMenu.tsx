import { all_routes } from "../../../feature-module/router/all_routes";
import { route } from "../../common/selectoption/selectoption";
const routes = all_routes;
interface SubmenuItem {
  label: string;
  link: string;
  themeSetting: boolean;
  icon: string;
  submenu?: boolean;
  submenuItems?: SubmenuItem[];
}

interface MainMenu {
  tittle: string;
  submenuItems: SubmenuItem[];
  label: string;
  icon: string;
  link: string;
  themeSetting: boolean;
}
export const SidebarDataTest = [
  {
    tittle: 'Main Menu',
    icon: 'airplay',
    showAsTab: true,
    separateRoute: false,
    submenuItems: [
      {
        label: 'Admin',
        link: 'index',
        submenu: true,
        showSubRoute: false,
        icon: 'smart-home',
        base: 'dashboard',
        materialicons: 'start',

        submenuItems: [
          { label: "Admin Dashboard", link: routes.adminDashboard },
          { label: "Manager Management",},
          { label: "Student Management",  },
          { label: "Tutor Management"},
          { label: "Project Management"},

        ],
      },
      {
        label: 'Manager',
        link: 'apps',
        submenu: true,
        showSubRoute: false,
        icon: 'layout-grid-add',
        base: 'application',
        materialicons: 'dashboard',
        submenuItems: [
          {
            label: 'Tutor Management',
            // link: routes.chat,

          },
          {
            label: 'Project Management',
            // link: routes.chat,

          },

        ],
      },
      {
        label: 'Tutor ',
        link: 'index',
        submenu: true,
        showSubRoute: false,
        icon: 'user-star',

        materialicons: '',
        submenuItems: [
          {
            label: 'Dashboard',
            // link: routes.superAdminDashboard,
            base: 'super-admin-dashboard',
          },
          {
            label: 'Groups List',
            // link: routes.superAdminCompanies,
            base: 'companies',
          },


        ],
      },
      {
        label: 'Student',
        link: 'task',
        submenu: true,
        showSubRoute: false,
        icon: 'layout-grid-add',
        base: 'application',
        materialicons: 'dashboard',
        submenuItems: [
          {
            label: 'Group Member',
            // link: routes.chat,

          },
          {
            label: 'Project Progress',
            // link: routes.chat,

          },
          {
            label: 'Tutor Feedbacks',
            // link: routes.chat,

          },

        ],
      },
    ],
  },
  
];