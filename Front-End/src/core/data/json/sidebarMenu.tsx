import { all_routes } from "../../../feature-module/router/all_routes";
import { route } from "../../common/selectoption/selectoption";
import useStudentGroupStatus from "../../hooks/useStudentGroupStatus";
const routes = all_routes;


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
          {
            label: 'Users List',
            link: routes.usersDashboard,
            base: 'usersManagement',
          },
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
        label: 'Tutor',
        link: 'index',
        submenu: true,
        showSubRoute: false,
        icon: 'user-star',

        materialicons: '',
        submenuItems: [
          // {
          //   label: 'Dashboard',
          //   link: routes.superAdminDashboard,
          //   base: 'super-admin-dashboard',
          // },
          {
            label: 'Groups List',
             link: routes.dealsDashboard,
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
          // {
          //   label: 'Group Member',
          //   // link: routes.chat,
          // },
          {
            label: 'Add Group',
            link: '/add-group',
            icon: 'plus',
          },
          {
            label: 'Project Progress',
            link: routes.taskboard,

          },
          // {
          //   label: 'Tutor Feedbacks',
          //   // link: routes.chat,
          //
          // },
          {
            tittle: 'PROJECTS',
            icon: 'layers',
            showAsTab: false,
            separateRoute: false,
            submenuItems: [
              // {
              //   label: 'Clients',
              //   link: routes.clientgrid,
              //   submenu: false,
              //   showSubRoute: false,
              //   icon: 'users-group',
              //   base: 'client',
              //   materialicons: 'person',
              //   submenuItems: [],
              // },
              {
                label: 'Projects',
                link: routes.project,
                submenu: true,
                showSubRoute: false,
                icon: 'box',
                base: 'projects',
                materialicons: 'topic',
                submenuItems: [
                  {
                    label: 'Projects',
                    link: routes.project,
                    base: 'project-grid',
                    base2: 'project-list',
                    base3: 'project-details',
                  },
                  {
                    label: 'To Do',
                    showSubRoute: false,
                    link: routes.todo,
                    customSubmenuTwo: false,
                    base: 'todo',
                  },
                  // { label: 'Tasks',
                  //   link: 'tasks',
                  //   base: 'tasks' },
                  // {
                  //   label: 'Task Board',
                  //   link: routes.taskboard,
                  //   base: 'task-board',
                  // },
                ],
              },
            ],
          },

        ],
      },
    ],
  },

];
