import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Chart } from "primereact/chart";
import { Calendar } from 'primereact/calendar';
import ProjectModals from "../../../core/modals/projectModal";
import RequestModals from "../../../core/modals/requestModal";
import TodoModal from "../../../core/modals/todoModal";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { fetchUsers, fetchStudentsBySpecialty, SpecialtyData } from "../../../api/getUsers/getAllUsers";
import { getProjectsCount, getAllProjects, ProjectType } from "../../../api/projectsApi/project/projectApi";
import { getTasksByProjectId, TaskType, getTaskCountsByProjectId, TaskCountsType } from "../../../api/projectsApi/task/taskApi";
import { getCodeFilesCount, getZipFilesCount, getManagersCount, getTutorsCount } from "../../../api/dashboardStats/dashboardStats";

const AdminDashboard = () => {
  const routes = all_routes;

  const [isTodo, setIsTodo] = useState([false, false, false]);
  const [date, setDate] = useState(new Date());

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);

    // Clean up the interval on component unmount
    return () => {
      clearInterval(timer);
    };
  }, []);

  // State variables for dashboard data
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [managersBySpecialty, setManagersBySpecialty] = useState<Record<string, any[]>>({});
  const [tasksByState, setTasksByState] = useState<Record<string, number>>({});
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, TaskCountsType>>({});
  const [loading, setLoading] = useState({
    users: true,
    projects: true,
    tasks: true,
    managers: true,
    codeFiles: true,
    zipFiles: true
  });
  const [error, setError] = useState({
    users: null,
    projects: null,
    tasks: null,
    managers: null,
    codeFiles: null,
    zipFiles: null
  });

  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalStudents: 0,
    totalTasks: 0,
    totalCodeFiles: 0,
    totalZipFiles: 0,
    totalManagers: 0,
    totalTutors: 0,
    projectsBySpecialty: {} as Record<string, number>
  });

  // Fetch data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        setLoading(prev => ({ ...prev, users: true, managers: true }));
        const usersData = await fetchUsers();
        setUsers(usersData);
        setLoading(prev => ({ ...prev, users: false }));

        // Calculate user statistics
        const totalUsers = usersData.length;
        const totalStudents = usersData.filter(user => user.role === 'student').length;
        const totalManagers = usersData.filter(user => user.role === 'manager').length;
        const totalTutors = usersData.filter(user => user.role === 'tutor').length;

        // Filter and group managers by specialty
        const managers = usersData.filter(user => user.role === 'manager');
        const groupedManagers = managers.reduce((acc, manager) => {
          const specialty = manager.speciality || 'Unspecified';
          if (!acc[specialty]) {
            acc[specialty] = [];
          }
          acc[specialty].push(manager);
          return acc;
        }, {} as Record<string, any[]>);

        setManagersBySpecialty(groupedManagers);
        setLoading(prev => ({ ...prev, managers: false }));

        // Fetch projects
        setLoading(prev => ({ ...prev, projects: true }));
        const projectsData = await getAllProjects();
        setProjects(projectsData);
        setLoading(prev => ({ ...prev, projects: false }));

        // Calculate project statistics
        const totalProjects = projectsData.length;

        // Group projects by specialty
        const projectsBySpecialty = projectsData.reduce((acc, project) => {
          const specialty = project.speciality || 'Other';
          acc[specialty] = (acc[specialty] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Fetch tasks for all projects
        setLoading(prev => ({ ...prev, tasks: true }));
        let allTasks: TaskType[] = [];
        const taskCountsMap: Record<string, TaskCountsType> = {};

        for (const project of projectsData) {
          if (project._id) {
            try {
              const projectTasks = await getTasksByProjectId(project._id);
              allTasks = [...allTasks, ...projectTasks];

              // Get task counts for this project
              const taskCounts = await getTaskCountsByProjectId(project._id);
              taskCountsMap[project._id] = taskCounts;
            } catch (error) {
              console.error(`Error fetching tasks for project ${project._id}:`, error);
            }
          }
        }

        // Store task counts for all projects
        setProjectTaskCounts(taskCountsMap);

        // Count tasks by état
        const tasksByStateCount = allTasks.reduce((acc, task) => {
          const state = task.état || 'To Do';
          acc[state] = (acc[state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setTasks(allTasks);
        setTasksByState(tasksByStateCount);
        setLoading(prev => ({ ...prev, tasks: false }));

        // Fetch code files and zip files counts
        setLoading(prev => ({ ...prev, codeFiles: true, zipFiles: true }));
        const [codeFilesCount, zipFilesCount] = await Promise.all([
          getCodeFilesCount(),
          getZipFilesCount()
        ]);
        setLoading(prev => ({ ...prev, codeFiles: false, zipFiles: false }));

        // Update all statistics
        setStats({
          totalUsers,
          totalProjects,
          totalStudents,
          totalTasks: allTasks.length,
          totalCodeFiles: codeFilesCount,
          totalZipFiles: zipFilesCount,
          totalManagers,
          totalTutors,
          projectsBySpecialty
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError({
          users: error as any,
          projects: error as any,
          tasks: error as any,
          managers: error as any,
          codeFiles: error as any,
          zipFiles: error as any
        });
        setLoading({
          users: false,
          projects: false,
          tasks: false,
          managers: false,
          codeFiles: false,
          zipFiles: false
        });
      }
    };

    fetchData();
  }, []);

  // Projects by Specialty Chart
  const [projectsBySpecialtyChart, setProjectsBySpecialtyChart] = useState<any>({
    chart: {
      height: 235,
      type: 'bar',
      padding: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      toolbar: {
        show: false,
      }
    },
    fill: {
      colors: ['#F26522'], // Fill color for the bars
      opacity: 1, // Adjust opacity (1 is fully opaque)
    },
    colors: ['#F26522'],
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      padding: {
        top: -20,
        left: 0,
        right: 0,
        bottom: 0
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        horizontal: true,
        barHeight: '35%',
        endingShape: 'rounded'
      }
    },
    dataLabels: {
      enabled: false
    },
    series: [{
      data: [0, 0, 0, 0, 0, 0],
      name: 'Projects'
    }],
    xaxis: {
      categories: ['Twin', 'SAE', 'AI', 'ERP/BI', 'NIDS', 'Other'],
      labels: {
        style: {
          colors: '#111827',
          fontSize: '13px',
        }
      }
    }
  });

  // Update chart when projects data changes
  useEffect(() => {
    if (Object.keys(stats.projectsBySpecialty).length > 0) {
      const specialties = ['Twin', 'SAE', 'AI', 'ERP/BI', 'NIDS', 'Other'];
      const data = specialties.map(specialty => stats.projectsBySpecialty[specialty] || 0);

      setProjectsBySpecialtyChart((prev: any) => ({
        ...prev,
        series: [{
          data,
          name: 'Projects'
        }]
      }));
    }
  }, [stats.projectsBySpecialty]);

  // Function to calculate project progress percentage based on task completion
  const calculateProgressPercentage = (projectId: string | undefined): number => {
    if (!projectId || !projectTaskCounts[projectId]) {
      return 0;
    }

    const { total, completed } = projectTaskCounts[projectId];

    // Avoid division by zero
    if (total === 0) {
      return 0;
    }

    // Calculate percentage of completed tasks
    return Math.round((completed / total) * 100);
  };

  // Function to get visible projects for the chart (up to 12)
  const [projectChartPage, setProjectChartPage] = useState(0);
  const projectsPerPage = 12;

  const getVisibleProjects = () => {
    const startIndex = projectChartPage * projectsPerPage;
    return projects.slice(startIndex, startIndex + projectsPerPage);
  };

  const hasMoreProjects = () => {
    return projects.length > (projectChartPage + 1) * projectsPerPage;
  };

  const hasPreviousProjects = () => {
    return projectChartPage > 0;
  };

  const nextProjectPage = () => {
    if (hasMoreProjects()) {
      setProjectChartPage(prev => prev + 1);
    }
  };

  const prevProjectPage = () => {
    if (hasPreviousProjects()) {
      setProjectChartPage(prev => prev - 1);
    }
  };

  // Project progress chart configuration
  const [projectProgress, setProjectProgress] = useState<any>({
    chart: {
      height: 290,
      type: 'bar',
      stacked: true,
      toolbar: {
        show: false,
      }
    },
    colors: ['#FF6F28', '#F8F9FA'],
    responsive: [{
      breakpoint: 480,
      options: {
        legend: {
          position: 'bottom',
          offsetX: -10,
          offsetY: 0
        }
      }
    }],
    plotOptions: {
      bar: {
        borderRadius: 5,
        borderRadiusWhenStacked: 'all',
        horizontal: false,
        endingShape: 'rounded'
      },
    },
    series: [{
      name: 'Completed',
      data: []
    }, {
      name: 'Remaining',
      data: []
    }],
    xaxis: {
      categories: [],
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '13px',
        },
        rotate: -45,
        trim: true,
        maxHeight: 50
      }
    },
    yaxis: {
      max: 100,
      labels: {
        offsetX: -15,
        style: {
          colors: '#6B7280',
          fontSize: '13px',
        },
        formatter: function(val: number) {
          return val + '%';
        }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      padding: {
        left: -8,
      },
    },
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false // Disable data labels
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function(val: number, opts: any) {
          const seriesName = opts.seriesIndex === 0 ? 'Completed' : 'Remaining';
          return val + '% ' + seriesName;
        }
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        // Get the sorted projects
        const sortedProjects = [...projects].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        // Get the visible projects from sorted list
        const startIndex = projectChartPage * projectsPerPage;
        const visibleProjects = sortedProjects.slice(startIndex, startIndex + projectsPerPage);

        const project = visibleProjects[dataPointIndex];
        if (!project || !project._id) return '';

        // Get task counts for this project
        const taskCounts = projectTaskCounts[project._id] || { total: 0, completed: 0 };
        const percentage = taskCounts.total > 0 
          ? Math.round((taskCounts.completed / taskCounts.total) * 100) 
          : 0;

        return `
          <div class="custom-tooltip">
            <div><strong>${project.title}</strong></div>
            <div>${taskCounts.completed}/${taskCounts.total} (${percentage}%)</div>
            <div>Difficulty: ${project.difficulty || 'Medium'}</div>
            <div>Specialty: ${project.speciality || 'N/A'}</div>
          </div>
        `;
      }
    }
  })

  // Update project progress chart when projects data changes or task counts change
  useEffect(() => {
    if (projects.length > 0 && Object.keys(projectTaskCounts).length > 0) {
      // Sort projects by creation date (newest first)
      const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Get visible projects from sorted list
      const startIndex = projectChartPage * projectsPerPage;
      const visibleProjects = sortedProjects.slice(startIndex, startIndex + projectsPerPage);

      const categories = visibleProjects.map(project => project.title.length > 15 ? project.title.substring(0, 15) + '...' : project.title);
      const completedData = visibleProjects.map(project => calculateProgressPercentage(project._id));
      const remainingData = visibleProjects.map(project => 100 - calculateProgressPercentage(project._id));

      setProjectProgress((prev: any) => ({
        ...prev,
        series: [
          {
            name: 'Completed',
            data: completedData
          },
          {
            name: 'Remaining',
            data: remainingData
          }
        ],
        xaxis: {
          ...prev.xaxis,
          categories
        }
      }));
    }
  }, [projects, projectChartPage, projectTaskCounts]);

  //Students by Specialty ChartJs
  const [chartData, setChartData] = useState<{
    labels?: string[];
    datasets?: Array<{
      label: string;
      data: number[];
      backgroundColor: string[];
      borderWidth: number;
      borderRadius: number;
      borderColor: string;
      hoverBorderWidth: number;
      cutout: string;
    }>;
  }>({});
  const [chartOptions, setChartOptions] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [specialties, setSpecialties] = useState<SpecialtyData[]>([]);

  useEffect(() => {
    const fetchSpecialtyData = async () => {
      try {
        const response = await fetchStudentsBySpecialty();

        if (response.success) {
          setTotalStudents(response.totalStudents);
          setSpecialties(response.specialties);

          // Generate colors for each specialty
          const colors = [
            '#0C4B5E', '#03C95A', '#FFC107', '#E70D0D', '#1B84FF', 
            '#9C27B0', '#FF9800', '#795548', '#607D8B', '#3F51B5', 
            '#009688', '#FF5722'
          ];

          // Create chart data
          const data = {
            labels: response.specialties.map(s => s.specialty),
            datasets: [
              {
                label: 'Students by Specialty',
                data: response.specialties.map(s => s.count),
                backgroundColor: response.specialties.map((_, index) => colors[index % colors.length]),
                borderWidth: 5,
                borderRadius: 10,
                borderColor: '#fff',
                hoverBorderWidth: 0,
                cutout: '60%',
              }
            ]
          };

          // Create chart options
          const options = {
            rotation: -100,
            circumference: 200,
            layout: {
              padding: {
                top: -20,
                bottom: -20,
              }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const specialty = response.specialties[context.dataIndex];
                    return `${specialty.specialty}: ${specialty.count} students (${specialty.percentage}%)`;
                  }
                }
              }
            },
          };

          setChartData(data);
          setChartOptions(options);
        }
      } catch (error) {
        console.error("Error fetching specialty data:", error);
      }
    };

    fetchSpecialtyData();
  }, []);

  //Semi Donut ChartJs
  const [semidonutData, setSemidonutData] = useState({});
  const [semidonutOptions, setSemidonutOptions] = useState({});
  const toggleTodo = (index: number) => {
    setIsTodo((prevIsTodo) => {
      const newIsTodo = [...prevIsTodo];
      newIsTodo[index] = !newIsTodo[index];
      return newIsTodo;
    });
  };
  useEffect(() => {
    // Define the task states and their colors
    const taskStates = ['To Do', 'In Progress', 'Completed', 'In Review'];
    const stateColors: { [key: string]: string } = {
      'To Do': '#FFC107', // Yellow/gold
      'In Progress': '#1B84FF', // Blue
      'Completed': '#03C95A', // Green
      'In Review': '#FF9800' // Orange/amber
    };

    // Prepare data for the chart
    const labels = [];
    const data = [];
    const colors = [];

    // Add data for each state
    for (const state of taskStates) {
      labels.push(state);
      data.push(tasksByState[state] || 0);
      colors.push(stateColors[state]);
    }

    // Add any additional states found in the database
    for (const state in tasksByState) {
      if (!taskStates.includes(state)) {
        labels.push(state);
        data.push(tasksByState[state]);
        colors.push('#9E9E9E'); // Default gray color for any additional states
      }
    }

    const chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Tasks by State',
          data: data,
          backgroundColor: colors,
          borderWidth: -10,
          borderColor: 'transparent', // Border between segments
          hoverBorderWidth: 0,   // Border radius for curved edges
          cutout: '75%',
          spacing: -30,
        },
      ],
    };

    const options = {
      rotation: -100,
      circumference: 185,
      layout: {
        padding: {
          top: -20,    // Set to 0 to remove top padding
          bottom: 20, // Set to 0 to remove bottom padding
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Hide the legend
        }
      }, elements: {
        arc: {
          borderWidth: -30, // Ensure consistent overlap
          borderRadius: 30, // Add some rounding
        }
      },
    };

    setSemidonutData(chartData);
    setSemidonutOptions(options);
  }, [tasksByState]);




  return (
      <>
        {/* Page Wrapper */}
        <div className="page-wrapper">
          <div className="content">
            {/* Breadcrumb */}
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Admin Dashboard</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Dashboard</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Admin Dashboard
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
            {/* /Breadcrumb */}
            {/* Welcome Wrap */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                {/*<span className="avatar avatar-xl flex-shrink-0">*/}
                {/*  <ImageWithBasePath*/}
                {/*      src={users.length > 0 && users[0].avatar ? users[0].avatar : "assets/img/profiles/avatar-31.jpg"}*/}
                {/*      className="rounded-circle"*/}
                {/*      alt="user avatar"*/}
                {/*  />*/}
                {/*</span>*/}
                  <div className="ms-3">
                    <h3 className="mb-0">
                      Welcome Back, {users.length > 0 ? users[0].name || 'User' : 'User'}{" "}
                      <Link to="#" className="edit-icon">
                        <i className="ti ti-edit fs-14" />
                      </Link>
                    </h3>
                  </div>
                </div>
                <div className="clock-container text-end">
                  <h3 className="mb-0 fw-medium">
                    <i className="ti ti-clock me-2"></i>
                    {date.toLocaleTimeString()}
                  </h3>
                  <p className="mb-0 text-muted">
                    {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
            {/* /Welcome Wrap */}
            <div className="row">
              {/* Widget Info */}
              <div className="col-xxl-8 d-flex">
                <div className="row flex-fill">
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-primary mb-1">
                        <i className="ti ti-calendar-share fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Attendance
                        </h6>
                        <h3 className="mb-2">
                          {loading.users ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalUsers
                          )}{" "}
                        </h3>
                        <Link to={routes.usersDashboard} className="link-default">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-success mb-1">
                        <i className="ti ti-user-shield fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Managers
                        </h6>
                        <h3 className="mb-2">
                          {loading.managers ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalManagers
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-info mb-1">
                        <i className="ti ti-users-group fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Total Students
                        </h6>
                        <h3 className="mb-2">
                          {loading.users ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalStudents
                          )}{" "}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-dark mb-1">
                        <i className="ti ti-school fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Tutors
                        </h6>
                        <h3 className="mb-2">
                          {loading.users ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalTutors
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-secondary mb-1">
                        <i className="ti ti-browser fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Total Project's
                        </h6>
                        <h3 className="mb-2">
                          {loading.projects ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalProjects
                          )}{" "}
                        </h3>
                        <Link to={routes.project} className="link-default">
                          View All
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-pink mb-1">
                        <i className="ti ti-checklist fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Total Tasks
                        </h6>
                        <h3 className="mb-2">
                          {loading.tasks ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalTasks
                          )}{" "}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-purple mb-1">
                        <i className="ti ti-file-code fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Code Files
                        </h6>
                        <h3 className="mb-2">
                          {loading.codeFiles ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalCodeFiles
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-danger mb-1">
                        <i className="ti ti-file-zip fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Zip Files
                        </h6>
                        <h3 className="mb-2">
                          {loading.zipFiles ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            stats.totalZipFiles
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* /Widget Info */}
              {/* Projects by Specialty */}
              <div className="col-xxl-4 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Projects by Specialty</h5>

                  </div>
                  <div className="card-body">
                    {loading.projects ? (
                      <div className="d-flex justify-content-center align-items-center" style={{ height: '220px' }}>
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <ReactApexChart
                          id="projects-specialty"
                          options={projectsBySpecialtyChart}
                          series={projectsBySpecialtyChart.series}
                          type="bar"
                          height={220}
                      />
                    )}
                    <p className="fs-13">
                      <i className="ti ti-circle-filled me-2 fs-8 text-primary" />
                      Project distribution by specialty across the platform
                    </p>
                  </div>
                </div>
              </div>
              {/* /Projects by Specialty */}
            </div>
            <div className="row">
              {/* Tasks */}
              <div className="col-xxl-4 col-xl-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Tasks</h5>
                    <div className="d-flex align-items-center">
                      <h5>Total tasks: {tasks.length}</h5>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="tasks-list" style={{ maxHeight: '300px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                      {tasks.length > 0 ? (
                        tasks.map((task, index) => {
                          // Determine dot color based on priority or status
                          let dotColor = '';
                          if (task.priority === 'High') {
                            dotColor = '#E70D0D'; // Red for high priority
                          } else if (task.priority === 'Medium') {
                            dotColor = '#FFC107'; // Yellow for medium priority
                          } else if (task.priority === 'Low') {
                            dotColor = '#03C95A'; // Green for low priority
                          }

                          // Alternative: color by status
                          if (task.état === 'To Do') {
                            dotColor = '#FFC107'; // Yellow for to do
                          } else if (task.état === 'In Progress') {
                            dotColor = '#1B84FF'; // Blue for in progress
                          } else if (task.état === 'Completed') {
                            dotColor = '#03C95A'; // Green for completed
                          } else if (task.état === 'In Review') {
                            dotColor = '#FF9800'; // Orange for in review
                          }

                          return (
                            <div key={index} className="d-flex align-items-center todo-item border p-2 br-5 mb-2">
                              <i className="ti ti-circle-filled me-2" style={{ color: dotColor }} />
                              <span className="fw-medium">{task.name}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-3">
                          <p>No tasks available</p>
                        </div>
                      )}
                    </div>
                    {tasks.length > 5 && (
                      <div className="text-center mt-2">
                        <div className="scroll-indicator" style={{ height: '4px', width: '50px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto' }}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* /Tasks */}
              {/* Students by Specialty */}
              <div className="col-xxl-4 col-xl-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Students by Specialty</h5>

                  </div>
                  <div className="card-body">
                    <div className="chartjs-wrapper-demo position-relative mb-4">
                      <Chart type="doughnut" data={chartData} options={chartOptions} className="w-full attendence-chart md:w-30rem" />
                      <div className="position-absolute text-center attendance-canvas">
                        <p className="fs-13 mb-1">Total Students</p>
                        <h3>{totalStudents}</h3>
                      </div>
                    </div>
                    <h6 className="mb-3">Specialties</h6>
                    {specialties.map((specialty, index) => (
                      <div key={index} className="d-flex align-items-center justify-content-between">
                        <p className="f-13 mb-2">
                          <i className={`ti ti-circle-filled me-1`} style={{ color: chartData?.datasets?.[0]?.backgroundColor?.[index] || '#000' }} />
                          {specialty.specialty}
                        </p>
                        <p className="f-13 fw-medium text-gray-9 mb-2">{specialty.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* /Students by Specialty */}
              {/* Managers */}
              <div className="col-xxl-4 col-xl-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Managers</h5>
                    <div className="d-flex align-items-center">
                      <h5>Total managers: {stats.totalManagers}</h5>
                    </div>
                  </div>
                  <div className="card-body">
                    {Object.keys(managersBySpecialty).length > 0 ? (
                      <div>
                        {Object.entries(managersBySpecialty).map(([specialty, managers]) => (
                          managers.length > 0 && (
                            <div key={specialty} className="mb-4">
                              <h6 className="mb-3">{specialty === 'Unspecified' ? 'General' : specialty}</h6>
                              {managers.map((manager, index) => (
                                <div key={index} className="d-flex align-items-center justify-content-between mb-3 p-2 border border-dashed br-5">
                                  <div className="d-flex align-items-center">
                                    <Link to="#" className="avatar flex-shrink-0">
                                      <ImageWithBasePath
                                        src={manager.avatar || "assets/img/profiles/avatar-default.jpg"}
                                        className="rounded-circle border border-2"
                                        alt={`${manager.name} ${manager.lastname}`}
                                      />
                                    </Link>
                                    <div className="ms-2">
                                      <h6 className="fs-14 fw-medium text-truncate">
                                        {manager.name} {manager.lastname}
                                      </h6>
                                      <p className="fs-13">{manager.speciality}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <p>No managers available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* /Managers */}
            </div>
            <div className="row">

            </div>
            <div className="row">
              {/* Project Progress */}
              <div className="col-12 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Project Progress</h5>
                  </div>
                  <div className="card-body pb-0">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                      <div className="d-flex align-items-center mb-1">
                        <p className="fs-13 text-gray-9 me-3 mb-0">
                          <i className="ti ti-square-filled me-2 text-primary" />
                          Completed
                        </p>
                        <p className="fs-13 text-gray-9 mb-0">
                          <i className="ti ti-square-filled me-2 text-gray-2" />
                          Remaining
                        </p>
                      </div>
                    </div>
                    {projects.length > 0 ? (
                      <>
                        <ReactApexChart
                          id="project-progress"
                          options={projectProgress}
                          series={projectProgress.series}
                          type="bar"
                          height={270}
                        />
                        {(hasPreviousProjects() || hasMoreProjects()) && (
                          <div className="d-flex justify-content-between mt-2 mb-3">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={prevProjectPage}
                              disabled={!hasPreviousProjects()}
                            >
                              <i className="ti ti-chevron-left"></i> Previous
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={nextProjectPage}
                              disabled={!hasMoreProjects()}
                            >
                              Next <i className="ti ti-chevron-right"></i>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-5">
                        <p>No projects available to display progress.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* /Project Progress */}
            </div>
            <div className="row">
              {/* Projects */}
              <div className="col-xxl-8 col-xl-7 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Projects</h5>
                    <div className="d-flex align-items-center">
                      <h5>Total projects: {stats.totalProjects}</h5>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-nowrap mb-0">
                        <thead>
                        <tr>
                          <th>Title</th>
                          <th>Specialty</th>
                          <th>Created Date</th>
                          <th>Difficulty</th>
                        </tr>
                        </thead>
                        <tbody>
                        {projects
                          .sort((a, b) => {
                            // Sort by creation date (newest first)
                            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                            return dateB - dateA;
                          })
                          .map((project, index) => {
                            // Format the created date as DD/MM/YYYY
                            const createdDate = project.createdAt 
                              ? new Date(project.createdAt)
                              : null;
                            const formattedDate = createdDate 
                              ? `${String(createdDate.getDate()).padStart(2, '0')}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${createdDate.getFullYear()}`
                              : 'N/A';

                            // Determine the badge color based on difficulty
                            let badgeClass = '';
                            switch(project.difficulty) {
                              case 'Easy':
                                badgeClass = 'badge-success'; // green
                                break;
                              case 'Medium':
                                badgeClass = 'badge-pink'; // pink/purple
                                break;
                              case 'Hard':
                              case 'Very Hard':
                                badgeClass = 'badge-danger'; // red
                                break;
                              default:
                                badgeClass = 'badge-secondary'; // default color
                            }

                            return (
                              <tr key={project._id || index}>
                                <td>
                                  <h6 className="fw-medium">
                                    <Link to={`/project-details/${project._id}`}>
                                      {project.title}
                                    </Link>
                                  </h6>
                                </td>
                                <td>
                                  {project.speciality || 'Unspecified'}
                                </td>
                                <td>{formattedDate}</td>
                                <td>
                                  <span className={`badge ${badgeClass} d-inline-flex align-items-center badge-xs`}>
                                    <i className="ti ti-point-filled me-1" />
                                    {project.difficulty || 'Medium'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        {projects.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center">
                              {loading.projects ? 'Loading projects...' : 'No projects found'}
                            </td>
                          </tr>
                        )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              {/* /Projects */}
              {/* Tasks Statistics */}
              <div className="col-xxl-4 col-xl-5 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Tasks Statistics</h5>
                  </div>
                  <div className="card-body">
                    <div className="chartjs-wrapper-demo position-relative mb-4">
                      <Chart type="doughnut" data={semidonutData} options={semidonutOptions} className="w-full md:w-30rem semi-donut-chart" />
                      <div className="position-absolute text-center attendance-canvas">
                        <p className="fs-13 mb-1">Total Tasks</p>
                        <h3>{tasksByState['Completed'] || 0}/{stats.totalTasks}</h3>
                      </div>
                    </div>
                    <div className="d-flex align-items-center flex-wrap">
                      {/* To Do */}
                      <div className="border-end text-center me-2 pe-2 mb-3">
                        <p className="fs-13 d-inline-flex align-items-center mb-1">
                          <i className="ti ti-circle-filled fs-10 me-1 text-warning" />
                          To Do
                        </p>
                        <h5>{stats.totalTasks ? Math.round((tasksByState['To Do'] || 0) / stats.totalTasks * 100) : 0}%</h5>
                      </div>
                      {/* In Progress */}
                      <div className="border-end text-center me-2 pe-2 mb-3">
                        <p className="fs-13 d-inline-flex align-items-center mb-1">
                          <i className="ti ti-circle-filled fs-10 me-1 text-info" />
                          In Progress
                        </p>
                        <h5>{stats.totalTasks ? Math.round((tasksByState['In Progress'] || 0) / stats.totalTasks * 100) : 0}%</h5>
                      </div>
                      {/* Completed */}
                      <div className="border-end text-center me-2 pe-2 mb-3">
                        <p className="fs-13 d-inline-flex align-items-center mb-1">
                          <i className="ti ti-circle-filled fs-10 me-1 text-success" />
                          Completed
                        </p>
                        <h5>{stats.totalTasks ? Math.round((tasksByState['Completed'] || 0) / stats.totalTasks * 100) : 0}%</h5>
                      </div>
                      {/* In Review */}
                      <div className="text-center me-2 pe-2 mb-3">
                        <p className="fs-13 d-inline-flex align-items-center mb-1">
                          <i className="ti ti-circle-filled fs-10 me-1 text-warning" style={{ color: '#FF9800' }} />
                          In Review
                        </p>
                        <h5>{stats.totalTasks ? Math.round((tasksByState['In Review'] || 0) / stats.totalTasks * 100) : 0}%</h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* /Tasks Statistics */}
            </div>
            <div className="row">
            </div>
          </div>
          <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
            <p className="mb-0">2024 - 2025 © Projexus.</p>
            <p>
              Designed &amp; Developed By{" "}
              <Link to="#" className="text-primary">
                Hunters
              </Link>
            </p>
          </div>
        </div>
        {/* /Page Wrapper */}
        <ProjectModals />
        <RequestModals />
        <TodoModal />
      </>

  );
};

export default AdminDashboard;
