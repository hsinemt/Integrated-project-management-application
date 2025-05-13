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
import { getProjectZipSubmissions } from "../../../api/projectsApi/project/zipProjectApi";

const ManagerDashboard = () => {
  const routes = all_routes;

  // Helper function to safely render assignedTo field
  const renderAssignedTo = (assignedTo: any) => {
    if (!assignedTo) return 'Unassigned';
    if (typeof assignedTo === 'string') return assignedTo;
    if (typeof assignedTo === 'object' && assignedTo.name) {
      return `${assignedTo.name} ${assignedTo.lastname || ''}`;
    }
    return 'Assigned';
  };

  const [isTodo, setIsTodo] = useState([false, false, false]);
  const [date, setDate] = useState(new Date());
  const [managerSpecialty, setManagerSpecialty] = useState<string>('');
  const [currentManager, setCurrentManager] = useState<any>(null);

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
  const [students, setStudents] = useState<any[]>([]);
  const [managersBySpecialty, setManagersBySpecialty] = useState<Record<string, any[]>>({});
  const [tasksByState, setTasksByState] = useState<Record<string, number>>({});
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, TaskCountsType>>({});
  const [codeFiles, setCodeFiles] = useState<any[]>([]);
  const [zipFiles, setZipFiles] = useState<any[]>([]);
  const [activeResourceTab, setActiveResourceTab] = useState<'code' | 'zip'>('code');

  // Tasks Statistics chart configuration
  const [semidonutData, setSemidonutData] = useState({});
  const [semidonutOptions, setSemidonutOptions] = useState({});
  const [loading, setLoading] = useState({
    users: true,
    projects: true,
    tasks: true,
    managers: true,
    codeFiles: true,
    zipFiles: true,
    resources: true
  });
  const [error, setError] = useState({
    users: null,
    projects: null,
    tasks: null,
    managers: null,
    codeFiles: null,
    zipFiles: null,
    resources: null
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

  // Get current manager's specialty
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      const fetchManagerData = async () => {
        try {
          const usersData = await fetchUsers();
          const manager = usersData.find(user => user._id === userId && user.role === 'manager');
          if (manager) {
            setCurrentManager(manager);
            // Ensure we get the specialty exactly as stored in the database
            const specialty = manager.speciality || '';
            setManagerSpecialty(specialty);
            console.log("Manager specialty retrieved:", specialty);
          }
        } catch (error) {
          console.error("Error fetching manager data:", error);
        }
      };
      fetchManagerData();
    }
  }, []);

  // Tasks Statistics chart configuration
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

  // Fetch data when component mounts
  useEffect(() => {
    // Continue even if managerSpecialty is not set - we'll still show projects created by the manager

    const fetchData = async () => {
      try {
        // Fetch users
        setLoading(prev => ({ ...prev, users: true, managers: true }));
        const usersData = await fetchUsers();

        // Filter users by manager's specialty (if set) - using case-sensitive matching
        const filteredUsers = managerSpecialty
            ? usersData.filter(user =>
                // Exact match on speciality
                user.speciality === managerSpecialty ||
                // Or student with project matching the specialty exactly
                (user.role === 'student' && user.projects?.some((project: any) =>
                    project.speciality === managerSpecialty
                ))
            )
            : usersData.filter(user => user.role === 'student'); // If no specialty, just get students

        setUsers(filteredUsers);

        // Filter students by manager's specialty (if set) - case-sensitive matching
        const filteredStudents = managerSpecialty
            ? usersData.filter(user =>
                user.role === 'student' && user.speciality === managerSpecialty
            )
            : []; // If no specialty, don't show any students in the specialty section

        setStudents(filteredStudents);
        setLoading(prev => ({ ...prev, users: false }));

        // Calculate user statistics
        const totalUsers = filteredUsers.length;
        const totalStudents = filteredUsers.filter(user => user.role === 'student').length;

        // Use exact case-sensitive matching for specialty in statistics
        const totalManagers = filteredUsers.filter(user =>
            user.role === 'manager' &&
            (managerSpecialty ? user.speciality === managerSpecialty : true)
        ).length;

        const totalTutors = filteredUsers.filter(user =>
            user.role === 'tutor' &&
            (managerSpecialty ? user.speciality === managerSpecialty : true)
        ).length;

        // Filter and group managers by specialty (only showing managers with the same specialty)
        // Use exact case-sensitive matching for specialty
        const managers = usersData.filter(user =>
            user.role === 'manager' &&
            (managerSpecialty ? user.speciality === managerSpecialty : true)
        );

        const groupedManagers = managers.reduce((acc, manager) => {
          // Use the exact specialty as stored in the database
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

        // Get user ID for creator comparison
        const userId = localStorage.getItem('userId');

        // Filter projects by manager's specialty (case-sensitive) or created by the manager
        let filteredProjects = projectsData.filter(project => {
          // Check if project specialty matches manager specialty (case-sensitive)
          const specialtyMatch = project.speciality && managerSpecialty &&
              project.speciality === managerSpecialty;

          // Check if manager is the creator
          const isCreator = project.creator && project.creator.userId === userId;

          // If manager has no specialty, only show projects they created
          // Otherwise, show projects matching specialty OR created by them
          return managerSpecialty ? (specialtyMatch || isCreator) : isCreator;
        });

        console.log(`Filtered projects: ${filteredProjects.length} of ${projectsData.length}`);
        console.log(`Filter criteria: specialty="${managerSpecialty}" or creator.userId="${userId}"`);

        // No fallback to all projects - only show projects matching criteria
        // This fixes the "No projects found matching your criteria" issue

        setProjects(filteredProjects);
        setLoading(prev => ({ ...prev, projects: false }));

        // Calculate project statistics
        const totalProjects = filteredProjects.length;

        // Group projects by specialty (should only be one specialty)
        const projectsBySpecialty = filteredProjects.reduce((acc, project) => {
          const specialty = project.speciality || 'Other';
          acc[specialty] = (acc[specialty] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Fetch tasks for filtered projects
        setLoading(prev => ({ ...prev, tasks: true }));
        let allTasks: TaskType[] = [];
        const taskCountsMap: Record<string, TaskCountsType> = {};

        for (const project of filteredProjects) {
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

        // Fetch code files and zip files counts (filtered by specialty if possible)
        setLoading(prev => ({ ...prev, codeFiles: true, zipFiles: true, resources: true }));
        const [codeFilesCount, zipFilesCount] = await Promise.all([
          getCodeFilesCount(),
          getZipFilesCount()
        ]);

        // Fetch code files for each task in filtered projects
        let allCodeFiles: any[] = [];
        let allZipFiles: any[] = [];

        for (const project of filteredProjects) {
          if (project._id) {
            try {
              // Get tasks for this project
              const projectTasks = await getTasksByProjectId(project._id);

              // Get code files for each task
              for (const task of projectTasks) {
                if (task._id && task.codeFiles) {
                  // If task has code files, add them to allCodeFiles
                  const taskCodeFiles = task.codeFiles.map(file => ({
                    ...file,
                    taskId: task._id,
                    taskTitle: task.name,
                    projectId: project._id,
                    projectTitle: project.title,
                    createdAt: file.createdAt || task.createdAt || new Date().toISOString()
                  }));
                  allCodeFiles = [...allCodeFiles, ...taskCodeFiles];
                }
              }

              // Get zip files for this project
              try {
                const projectZipFiles = await getProjectZipSubmissions(project._id);
                const processedZipFiles = projectZipFiles.map(zipFile => ({
                  ...zipFile,
                  projectId: project._id,
                  projectTitle: project.title,
                  createdAt: zipFile.createdAt || new Date().toISOString()
                }));
                allZipFiles = [...allZipFiles, ...processedZipFiles];
              } catch (error) {
                console.error(`Error fetching zip files for project ${project._id}:`, error);
              }
            } catch (error) {
              console.error(`Error fetching resources for project ${project._id}:`, error);
            }
          }
        }

        setCodeFiles(allCodeFiles);
        setZipFiles(allZipFiles);
        setLoading(prev => ({ ...prev, codeFiles: false, zipFiles: false, resources: false }));

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

        // Determine which specific API call failed
        let errorMessage = "Failed to load dashboard data. Please try again later.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Set specific error messages for each section
        setError({
          users: error as any,
          projects: error as any,
          tasks: error as any,
          managers: error as any,
          codeFiles: error as any,
          zipFiles: error as any,
          resources: error as any
        });

        // Display error notification to user
        alert(`Error: ${errorMessage}`);

        // Reset loading states
        setLoading({
          users: false,
          projects: false,
          tasks: false,
          managers: false,
          codeFiles: false,
          zipFiles: false,
          resources: false
        });
      }
    };

    fetchData();
  }, [managerSpecialty]);

  return (
      <>
        {/* Page Wrapper */}
        <div className="page-wrapper">
          <div className="content">
            {/* Breadcrumb */}
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Manager Dashboard</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Dashboard</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Manager Dashboard
                    </li>
                  </ol>
                </nav>
              </div>
            </div>

            {/* Welcome Wrap */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="ms-3">
                    <h3 className="mb-0">
                      Welcome Back, {currentManager ? currentManager.name || 'Manager' : 'Manager'}{" "}
                      <Link to="#" className="edit-icon">
                        <i className="ti ti-edit fs-14" />
                      </Link>
                    </h3>
                    <p className="mb-0">
                      Specialty: <strong>{managerSpecialty || 'Not specified'}</strong>
                      {!managerSpecialty && (
                          <span className="text-muted ms-2">
                        (Only showing projects you've created)
                      </span>
                      )}
                    </p>
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

            {/* Widget Info */}
            <div className="row">
              <div className="col-xxl-8 d-flex">
                <div className="row flex-fill">
                  <div className="col-md-3 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body py-2">
                      <span className="avatar rounded-circle bg-primary mb-1">
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
                      <span className="avatar rounded-circle bg-secondary mb-1">
                        <i className="ti ti-browser fs-16" />
                      </span>
                        <h6 className="fs-13 fw-medium text-default mb-1">
                          Total Projects
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
                </div>
              </div>

              {/* Projects by Specialty */}
              <div className="col-xxl-4 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Manager Info</h5>
                  </div>
                  <div className="card-body">
                    <p>
                      {managerSpecialty ? (
                          <>Showing projects that match your specialty (<strong>{managerSpecialty}</strong>) or projects you've created.</>
                      ) : (
                          <>You don't have a specialty set. Only showing projects you've created.</>
                      )}
                    </p>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        <p className="mb-0"><i className="ti ti-users text-primary me-2"></i> Students: <strong>{stats.totalStudents}</strong></p>
                        <p className="mb-0"><i className="ti ti-browser text-secondary me-2"></i> Projects: <strong>{stats.totalProjects}</strong></p>
                      </div>
                      <div>
                        <p className="mb-0"><i className="ti ti-checklist text-pink me-2"></i> Tasks: <strong>{stats.totalTasks}</strong></p>
                        <p className="mb-0"><i className="ti ti-file-code text-purple me-2"></i> Files: <strong>{stats.totalCodeFiles}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects List */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5>Your Projects</h5>
                  </div>
                  <div className="card-body">
                    {projects.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-striped">
                            <thead>
                            <tr>
                              <th>Project Name</th>
                              <th>Specialty</th>
                              <th>Status</th>
                              <th>Created By</th>
                              <th>Students</th>
                              <th>Tasks</th>
                              <th>Progress</th>
                            </tr>
                            </thead>
                            <tbody>
                            {projects.map(project => {
                              const projectStudents = users.filter(user =>
                                  user.projects?.some((p: any) => p._id === project._id)
                              ).length;

                              const projectTaskCount = projectTaskCounts[project._id || '']?.total || 0;
                              const completedTasks = projectTaskCounts[project._id || '']?.completed || 0;
                              const progress = projectTaskCount > 0
                                  ? Math.round((completedTasks / projectTaskCount) * 100)
                                  : 0;

                              // Determine if this is the manager's own project
                              const userId = localStorage.getItem('userId');
                              const isOwnProject = project.creator && project.creator.userId === userId;

                              return (
                                  <tr key={project._id} className={isOwnProject ? "table-primary" : ""}>
                                    <td>
                                      <Link to={`/project-details/${project._id}`}>
                                        {project.title}
                                      </Link>
                                      {isOwnProject && <span className="badge bg-info ms-2">Your Project</span>}
                                    </td>
                                    <td>{project.speciality || 'N/A'}</td>
                                    <td>{project.status || 'Not Started'}</td>
                                    <td>{project.creator ? `${project.creator.name} ${project.creator.lastname}` : 'N/A'}</td>
                                    <td>{projectStudents}</td>
                                    <td>{projectTaskCount}</td>
                                    <td>
                                      <div className="progress" style={{ height: '5px' }}>
                                        <div
                                            className="progress-bar bg-success"
                                            role="progressbar"
                                            style={{ width: `${progress}%` }}
                                            aria-valuenow={progress}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        ></div>
                                      </div>
                                      <small className="mt-1 d-block">{progress}% Complete</small>
                                    </td>
                                  </tr>
                              );
                            })}
                            </tbody>
                          </table>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                          <i className="ti ti-folder-off fs-3 text-muted mb-3"></i>
                          <p className="mb-1">No projects found matching your criteria.</p>
                          <p className="text-muted">Try creating a new project or contact an administrator.</p>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              {/* Tasks */}
              <div className="col-xxl-8 col-xl-7 d-flex">
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
                            // Determine dot color based on status
                            let dotColor = '';
                            if (task.état === 'To Do') {
                              dotColor = '#FFC107'; // Yellow for to do
                            } else if (task.état === 'In Progress') {
                              dotColor = '#1B84FF'; // Blue for in progress
                            } else if (task.état === 'Completed') {
                              dotColor = '#03C95A'; // Green for completed
                            } else if (task.état === 'In Review') {
                              dotColor = '#FF9800'; // Orange for in review
                            }

                            // Find the project for this task
                            const project = projects.find(p => p._id === task.project);
                            const projectName = project ? project.title : 'Unknown Project';

                            return (
                                <div key={index} className="d-flex align-items-center todo-item border p-2 br-5 mb-2">
                                  <i className="ti ti-circle-filled me-2" style={{ color: dotColor }} />
                                  <div className="flex-grow-1">
                                    <span className="fw-medium">{task.name}</span>
                                    <small className="d-block text-muted">{projectName} • {task.date ? new Date(task.date).toLocaleDateString() : 'No due date'}</small>
                                  </div>
                                  <span className="badge" style={{ backgroundColor: dotColor }}>
                              {task.état || 'To Do'}
                            </span>
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

              {/* Tasks Statistics */}
              <div className="col-xxl-4 col-xl-5 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Tasks Statistics</h5>
                  </div>
                  <div className="card-body">
                    <div className="chartjs-wrapper-demo position-relative mb-4">
                      <Chart type="doughnut" data={semidonutData} options={semidonutOptions} className="w-full md:w-30rem semi-donut-chart" />
                      <div className="position-absolute text-center" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
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

            {/* Students Section */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5>Students in Your Specialty</h5>
                  </div>
                  <div className="card-body">
                    {students.length > 0 ? (
                        <div className="row">
                          {students.map(student => {
                            // Find projects for this student
                            const studentProjects = projects.filter(project =>
                                student.projects?.some((p: any) => p._id === project._id)
                            );

                            return (
                                <div className="col-md-4 col-sm-6 mb-4" key={student._id}>
                                  <div className="card border h-100">
                                    <div className="card-body">
                                      <div className="d-flex align-items-center mb-3">
                                        <div className="avatar me-3">
                                          {student.avatar ? (
                                              <img
                                                  src={student.avatar}
                                                  alt={`${student.name} ${student.lastname}`}
                                                  className="rounded-circle"
                                                  width="50"
                                                  height="50"
                                              />
                                          ) : (
                                              <div
                                                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                                  style={{ width: '50px', height: '50px' }}
                                              >
                                                {student.name.charAt(0)}{student.lastname.charAt(0)}
                                              </div>
                                          )}
                                        </div>
                                        <div>
                                          <h5 className="mb-0">{student.name} {student.lastname}</h5>
                                          <p className="text-muted mb-0">
                                      <span className={`badge ${student.Status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                                        {student.Status || 'Unknown'}
                                      </span>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mb-3">
                                        <h6>Projects:</h6>
                                        {studentProjects.length > 0 ? (
                                            <ul className="list-group">
                                              {studentProjects.map(project => (
                                                  <li className="list-group-item d-flex justify-content-between align-items-center" key={project._id}>
                                                    <span>{project.title}</span>
                                                    <span className="badge bg-primary rounded-pill">{project.status}</span>
                                                  </li>
                                              ))}
                                            </ul>
                                        ) : (
                                            <p className="text-muted">No projects assigned</p>
                                        )}
                                      </div>

                                      <div>
                                        <h6>Enrollment Status:</h6>
                                        <p className="mb-0">
                                          {student.enrollmentStatus || 'Not specified'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                    ) : (
                        <div className="text-center py-5">
                          <i className="ti ti-users-off fs-3 text-muted mb-3"></i>
                          {managerSpecialty ? (
                              <>
                                <p className="mb-1">No students found in the <strong>{managerSpecialty}</strong> specialty.</p>
                                <p className="text-muted">Students will appear here when they are assigned to your specialty.</p>
                              </>
                          ) : (
                              <>
                                <p className="mb-1">You don't have a specialty set.</p>
                                <p className="text-muted">Contact an administrator to set your specialty.</p>
                              </>
                          )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resources Section */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5>Project Resources</h5>
                    <div className="card-actions">
                      <ul className="nav nav-tabs card-tabs">
                        <li className="nav-item">
                          <button
                              className={`nav-link ${activeResourceTab === 'code' ? 'active' : ''}`}
                              onClick={() => setActiveResourceTab('code')}
                          >
                            Code Files
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                              className={`nav-link ${activeResourceTab === 'zip' ? 'active' : ''}`}
                              onClick={() => setActiveResourceTab('zip')}
                          >
                            Zip Files
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="card-body">
                    {loading.resources ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="mt-2">Loading resources...</p>
                        </div>
                    ) : (
                        <>
                          {/* Code Files Tab */}
                          {activeResourceTab === 'code' && (
                              <>
                                {codeFiles.length > 0 ? (
                                    <div className="table-responsive">
                                      <table className="table table-striped">
                                        <thead>
                                        <tr>
                                          <th>File Name</th>
                                          <th>Type</th>
                                          <th>Project</th>
                                          <th>Task</th>
                                          <th>Creation Date</th>
                                          <th>Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {codeFiles.map((file, index) => (
                                            <tr key={`${file._id || file.fileName}-${index}`}>
                                              <td>{file.fileName}</td>
                                              <td>{file.language || 'Unknown'}</td>
                                              <td>{file.projectTitle || 'Unknown'}</td>
                                              <td>{file.taskTitle || 'Unknown'}</td>
                                              <td>
                                                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}
                                              </td>
                                              <td>
                                                <div className="btn-group">
                                                  <button className="btn btn-sm btn-primary">
                                                    <i className="ti ti-eye"></i>
                                                  </button>
                                                  <button className="btn btn-sm btn-secondary">
                                                    <i className="ti ti-download"></i>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                      </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                      <i className="ti ti-file-code fs-3 text-muted mb-3"></i>
                                      {managerSpecialty ? (
                                          <>
                                            <p className="mb-1">No code files found for projects in the <strong>{managerSpecialty}</strong> specialty.</p>
                                            <p className="text-muted">Code files will appear here when they are uploaded to projects in your specialty.</p>
                                          </>
                                      ) : (
                                          <>
                                            <p className="mb-1">You don't have a specialty set.</p>
                                            <p className="text-muted">Contact an administrator to set your specialty. Currently only showing files from projects you've created.</p>
                                          </>
                                      )}
                                    </div>
                                )}
                              </>
                          )}

                          {/* Zip Files Tab */}
                          {activeResourceTab === 'zip' && (
                              <>
                                {zipFiles.length > 0 ? (
                                    <div className="table-responsive">
                                      <table className="table table-striped">
                                        <thead>
                                        <tr>
                                          <th>Submission ID</th>
                                          <th>Project</th>
                                          <th>Status</th>
                                          <th>Submitted By</th>
                                          <th>Creation Date</th>
                                          <th>Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {zipFiles.map((file, index) => (
                                            <tr key={`${file._id || file.submissionId}-${index}`}>
                                              <td>{file.submissionId || file._id || 'Unknown'}</td>
                                              <td>{file.projectTitle || 'Unknown'}</td>
                                              <td>
                                        <span className={`badge ${file.status === 'completed' ? 'bg-success' : file.status === 'processing' ? 'bg-warning' : 'bg-secondary'}`}>
                                          {file.status || 'Unknown'}
                                        </span>
                                              </td>
                                              <td>{file.submittedBy?.name || 'Unknown'}</td>
                                              <td>
                                                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}
                                              </td>
                                              <td>
                                                <div className="btn-group">
                                                  <button className="btn btn-sm btn-primary">
                                                    <i className="ti ti-eye"></i>
                                                  </button>
                                                  <button className="btn btn-sm btn-secondary">
                                                    <i className="ti ti-download"></i>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                      </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                      <i className="ti ti-file-zip fs-3 text-muted mb-3"></i>
                                      {managerSpecialty ? (
                                          <>
                                            <p className="mb-1">No zip files found for projects in the <strong>{managerSpecialty}</strong> specialty.</p>
                                            <p className="text-muted">Zip files will appear here when they are uploaded to projects in your specialty.</p>
                                          </>
                                      ) : (
                                          <>
                                            <p className="mb-1">You don't have a specialty set.</p>
                                            <p className="text-muted">Contact an administrator to set your specialty. Currently only showing files from projects you've created.</p>
                                          </>
                                      )}
                                    </div>
                                )}
                              </>
                          )}
                        </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ProjectModals />
        <RequestModals />
        <TodoModal />
      </>
  );
};

// Change this line from a named export to a default export
export default ManagerDashboard;