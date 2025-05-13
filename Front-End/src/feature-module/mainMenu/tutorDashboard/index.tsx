import React, { useEffect, useState } from "react";
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
import { getProjectsCount, getAllProjects, ProjectType, getGroupsByProjectId, getGroupsByTutorId, GroupType } from "../../../api/projectsApi/project/projectApi";
import { getTasksByProjectId, TaskType, getTaskCountsByProjectId, TaskCountsType } from "../../../api/projectsApi/task/taskApi";
import { getCodeFilesCount, getZipFilesCount, getManagersCount, getTutorsCount } from "../../../api/dashboardStats/dashboardStats";

// Define a type for students from groups
interface StudentWithProjectInfo {
  _id?: string;
  name: string;
  lastname: string;
  email: string;
  projectId: string;
  projectTitle: string;
  groupId: string;
  groupName: string;
  speciality?: string;
  [key: string]: any; // For any other properties that might exist
}

const TutorDashboard = () => {
  const routes = all_routes;

  const [isTodo, setIsTodo] = useState([false, false, false]);
  const [date, setDate] = useState(new Date());
  const [currentTutor, setCurrentTutor] = useState<any>(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("");
  const [filteredStudents, setFilteredStudents] = useState<StudentWithProjectInfo[]>([]);

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
  const [tasksByState, setTasksByState] = useState<Record<string, number>>({});
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, TaskCountsType>>({});
  const [projectGroups, setProjectGroups] = useState<Record<string, GroupType[]>>({});
  const [studentsFromGroups, setStudentsFromGroups] = useState<StudentWithProjectInfo[]>([]);
  const [loading, setLoading] = useState({
    users: true,
    projects: true,
    tasks: true,
    codeFiles: true,
    zipFiles: true,
    groups: true,
    studentsFromGroups: true
  });
  // Define error state with proper nullable types
  const [error, setError] = useState<{
    users: string | null;
    projects: string | null;
    tasks: string | null;
    codeFiles: string | null;
    zipFiles: string | null;
    groups: Record<string, string>;
    studentsFromGroups: string | null;
  }>({
    users: null,
    projects: null,
    tasks: null,
    codeFiles: null,
    zipFiles: null,
    groups: {} as Record<string, string>,
    studentsFromGroups: null
  });

  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalStudents: 0,
    totalTasks: 0,
    totalCodeFiles: 0,
    totalZipFiles: 0,
    projectsBySpecialty: {} as Record<string, number>
  });

  // Effect to filter students based on selected project
  useEffect(() => {
    if (selectedProjectFilter) {
      // Filter students by selected project
      const filtered = studentsFromGroups.filter(
          student => student.projectId === selectedProjectFilter
      );
      setFilteredStudents(filtered);
      console.log(`Filtered to ${filtered.length} students for project ${selectedProjectFilter}`);
    } else {
      // No filter, show all students
      setFilteredStudents(studentsFromGroups);
    }
  }, [selectedProjectFilter, studentsFromGroups]);

  // Get current tutor's assigned projects
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      const fetchTutorData = async () => {
        try {
          const usersData = await fetchUsers();
          const tutor = usersData.find(user => user._id === userId && user.role === 'tutor');
          if (tutor) {
            setCurrentTutor(tutor);
            console.log("Tutor ID retrieved:", userId);

            // Get projects assigned to this tutor
            const projectsData = await getAllProjects();

            // Check both tutors array and assignedTutor field
            const assignedProjects = projectsData.filter(project => {
              // Check if tutor is in the tutors array
              const inTutorsArray = project.tutors &&
                  project.tutors.some((tutorId: string) => tutorId === userId);

              // Check if tutor is the assignedTutor
              const isAssignedTutor = project.assignedTutor &&
                  project.assignedTutor._id === userId;

              return inTutorsArray || isAssignedTutor;
            });

            console.log(`Found ${assignedProjects.length} assigned projects out of ${projectsData.length} total projects`);

            const projectIds = assignedProjects.map(project => project._id).filter(Boolean) as string[];
            setAssignedProjectIds(projectIds);

            // If no assigned projects found, log a warning
            if (assignedProjects.length === 0 && projectsData.length > 0) {
              console.warn("No projects assigned to this tutor. Consider showing all projects as fallback.");
            }
          }
        } catch (error) {
          console.error("Error fetching tutor data:", error);
        }
      };
      fetchTutorData();
    }
  }, []);

  // Fetch data when component mounts
  useEffect(() => {
    // Continue even if no assigned projects, we'll show a fallback
    const fetchData = async () => {
      try {
        // Fetch projects
        setLoading(prev => ({ ...prev, projects: true }));
        const projectsData = await getAllProjects();

        // Filter projects by assigned project IDs
        let filteredProjects = projectsData.filter(project =>
            project._id && assignedProjectIds.includes(project._id)
        );

        console.log(`Filtered projects: ${filteredProjects.length} of ${projectsData.length}`);

        // If no projects match the criteria, show all projects as fallback
        if (filteredProjects.length === 0 && projectsData.length > 0) {
          console.log("No assigned projects found. Showing all projects as fallback.");
          filteredProjects = projectsData;
        }

        setProjects(filteredProjects);
        setLoading(prev => ({ ...prev, projects: false }));

        // Calculate project statistics
        const totalProjects = filteredProjects.length;

        // Group projects by specialty
        const projectsBySpecialty = filteredProjects.reduce((acc, project) => {
          const specialty = project.speciality || 'Other';
          acc[specialty] = (acc[specialty] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Fetch users (students) in these projects
        setLoading(prev => ({ ...prev, users: true }));
        const usersData = await fetchUsers();

        // Filter students who are in the tutor's assigned projects
        const filteredUsers = usersData.filter(user =>
            user.role === 'student' &&
            user.projects?.some((project: any) =>
                project._id && assignedProjectIds.includes(project._id)
            )
        );

        setUsers(filteredUsers);
        setLoading(prev => ({ ...prev, users: false }));

        // Fetch groups directly from the database where id_tutor matches the current tutor's ID
        setLoading(prev => ({ ...prev, groups: true, studentsFromGroups: true }));
        const groupsMap: Record<string, GroupType[]> = {};
        let allStudentsFromGroups: StudentWithProjectInfo[] = [];

        console.log("Fetching groups where tutor ID matches the current tutor...");
        console.log("Using endpoint: /group/by-user/:userId to get groups for tutor");

        try {
          const userId = localStorage.getItem('userId');
          if (!userId) {
            throw new Error("User ID not found in localStorage");
          }

          // Fetch groups where id_tutor matches the current tutor's ID
          const tutorGroups = await getGroupsByTutorId(userId);
          console.log(`Found ${tutorGroups.length} groups assigned to this tutor`);

          if (tutorGroups.length === 0) {
            console.warn("No groups found where this tutor is assigned as the tutor.");
            console.warn("This could be because: 1) The tutor is not assigned to any groups, or 2) The groups exist but with a different structure than expected.");
          }

          // Process each group and extract students
          for (const group of tutorGroups) {
            if (group.id_project && group.id_project._id) {
              const projectId = group.id_project._id;
              const projectTitle = group.id_project.title;

              // Initialize the array for this project if it doesn't exist
              if (!groupsMap[projectId]) {
                groupsMap[projectId] = [];
              }

              // Add the group to the map
              groupsMap[projectId].push(group);

              // Create StudentWithProjectInfo objects for each student in the group
              if (group.id_students && group.id_students.length > 0) {
                const studentsWithProjectInfo = group.id_students.map(student => ({
                  _id: student._id,
                  name: student.name,
                  lastname: student.lastname,
                  email: student.email,
                  projectId: projectId,
                  projectTitle: projectTitle,
                  groupId: group._id,
                  groupName: group.nom_groupe,
                  speciality: (student as any).speciality || 
                              filteredProjects.find(p => p._id === projectId)?.speciality || 
                              'Not specified'
                })) as StudentWithProjectInfo[];

                // Add to the collection of all students
                allStudentsFromGroups = [...allStudentsFromGroups, ...studentsWithProjectInfo];
              }
            }
          }

          // If no groups found, fall back to the client-side approach
          if (tutorGroups.length === 0) {
            console.log("No groups found for this tutor. Falling back to client-side filtering...");

            // We already have all students in usersData, so we'll filter and process them
            const allStudents = usersData.filter(user => user.role === 'student');
            console.log(`Found ${allStudents.length} total students`);

            // Process each project
            for (const project of filteredProjects) {
              if (project._id) {
                // Create a virtual group for each project
                const virtualGroup: GroupType = {
                  _id: `virtual-group-${project._id}`,
                  nom_groupe: `${project.title} Group`,
                  id_students: [],
                  id_tutor: null,
                  id_project: {
                    _id: project._id,
                    title: project.title
                  }
                };

                // Find students associated with this project
                const projectStudents = allStudents.filter(student => 
                  student.projects?.some((p: any) => p._id === project._id)
                );

                // Add students to the virtual group
                virtualGroup.id_students = projectStudents.map(student => ({
                  _id: student._id || '',
                  name: student.name,
                  lastname: student.lastname,
                  email: student.email,
                  speciality: student.speciality
                }));

                // Store the virtual group
                groupsMap[project._id] = [virtualGroup];
                console.log(`Created virtual group for project ${project._id} with ${virtualGroup.id_students.length} students`);

                // Create StudentWithProjectInfo objects for each student
                const studentsWithProjectInfo = projectStudents.map(student => ({
                  _id: student._id,
                  name: student.name,
                  lastname: student.lastname,
                  email: student.email,
                  projectId: project._id,
                  projectTitle: project.title,
                  groupId: virtualGroup._id,
                  groupName: virtualGroup.nom_groupe,
                  speciality: student.speciality || project.speciality || 'Not specified'
                })) as StudentWithProjectInfo[];

                // Add to the collection of all students
                allStudentsFromGroups = [...allStudentsFromGroups, ...studentsWithProjectInfo];
              }
            }
          }
        } catch (error) {
          console.error("Error fetching groups for tutor:", error);
          // Add user-friendly error message with proper type casting
          setError(prev => ({
            ...prev,
            studentsFromGroups: `Could not fetch groups for tutor. ${error instanceof Error ? error.message : ''}` as string | null
          }));

          // Fall back to client-side filtering if there's an error
          console.log("Falling back to client-side filtering due to error...");

          // We already have all students in usersData, so we'll filter and process them
          const allStudents = usersData.filter(user => user.role === 'student');
          console.log(`Found ${allStudents.length} total students`);

          // Process each project
          for (const project of filteredProjects) {
            if (project._id) {
              // Create a virtual group for each project
              const virtualGroup: GroupType = {
                _id: `virtual-group-${project._id}`,
                nom_groupe: `${project.title} Group`,
                id_students: [],
                id_tutor: null,
                id_project: {
                  _id: project._id,
                  title: project.title
                }
              };

              // Find students associated with this project
              const projectStudents = allStudents.filter(student => 
                student.projects?.some((p: any) => p._id === project._id)
              );

              // Add students to the virtual group
              virtualGroup.id_students = projectStudents.map(student => ({
                _id: student._id || '',
                name: student.name,
                lastname: student.lastname,
                email: student.email,
                speciality: student.speciality
              }));

              // Store the virtual group
              groupsMap[project._id] = [virtualGroup];
              console.log(`Created virtual group for project ${project._id} with ${virtualGroup.id_students.length} students`);

              // Create StudentWithProjectInfo objects for each student
              const studentsWithProjectInfo = projectStudents.map(student => ({
                _id: student._id,
                name: student.name,
                lastname: student.lastname,
                email: student.email,
                projectId: project._id,
                projectTitle: project.title,
                groupId: virtualGroup._id,
                groupName: virtualGroup.nom_groupe,
                speciality: student.speciality || project.speciality || 'Not specified'
              })) as StudentWithProjectInfo[];

              // Add to the collection of all students
              allStudentsFromGroups = [...allStudentsFromGroups, ...studentsWithProjectInfo];
            }
          }
        }

        setProjectGroups(groupsMap);
        setStudentsFromGroups(allStudentsFromGroups);
        setLoading(prev => ({ ...prev, groups: false, studentsFromGroups: false }));

        console.log(`Found ${allStudentsFromGroups.length} students from groups`);

        // Calculate user statistics - now including students from groups
        const totalStudents = allStudentsFromGroups.length;

        // Update the stats with the correct student count
        setStats(prev => ({
          ...prev,
          totalStudents: totalStudents
        }));

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

        // Fetch code files and zip files counts (filtered by projects if possible)
        setLoading(prev => ({ ...prev, codeFiles: true, zipFiles: true }));
        const [codeFilesCount, zipFilesCount] = await Promise.all([
          getCodeFilesCount(),
          getZipFilesCount()
        ]);
        setLoading(prev => ({ ...prev, codeFiles: false, zipFiles: false }));

        // Update all statistics
        setStats({
          totalUsers: filteredUsers.length,
          totalProjects,
          totalStudents,
          totalTasks: allTasks.length,
          totalCodeFiles: codeFilesCount,
          totalZipFiles: zipFilesCount,
          projectsBySpecialty
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);

        // Create a user-friendly error message
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while loading dashboard data';

        // Update error state while preserving any existing group errors
        // Use proper type casting for nullable types
        setError(prev => ({
          users: errorMessage as string | null,
          projects: errorMessage as string | null,
          tasks: errorMessage as string | null,
          codeFiles: errorMessage as string | null,
          zipFiles: errorMessage as string | null,
          groups: prev.groups, // Preserve existing group errors
          studentsFromGroups: errorMessage as string | null
        }));

        // Ensure loading states are all set to false
        setLoading({
          users: false,
          projects: false,
          tasks: false,
          codeFiles: false,
          zipFiles: false,
          groups: false,
          studentsFromGroups: false
        });
      }
    };

    fetchData();
  }, [assignedProjectIds]);

  // Tasks Statistics chart configuration
  const [semidonutData, setSemidonutData] = useState({});
  const [semidonutOptions, setSemidonutOptions] = useState({});

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
                <h2 className="mb-1">Tutor Dashboard</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Dashboard</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Tutor Dashboard
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
                  <div className="ms-3">
                    <h3 className="mb-0">
                      Welcome Back, {currentTutor ? currentTutor.name || 'Tutor' : 'Tutor'}{" "}
                      <Link to="#" className="edit-icon">
                        <i className="ti ti-edit fs-14" />
                      </Link>
                    </h3>
                    <p className="mb-0">
                      Assigned Projects: {projects.length}
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
            {/* /Welcome Wrap */}

            <div className="row">
              {/* Widget Info */}
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
              {/* /Widget Info */}

              {/* Tutor Info */}
              <div className="col-xxl-4 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Tutor Info</h5>
                  </div>
                  <div className="card-body">
                    <p>
                      {assignedProjectIds.length > 0 ? (
                          <>Showing projects assigned to you as a tutor. You have <strong>{assignedProjectIds.length}</strong> assigned projects.</>
                      ) : (
                          <>You don't have any projects assigned. Contact an administrator to get projects assigned to you.</>
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
              {/* /Tutor Info */}
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
                              <Link 
                                to={`${routes.tasksdetails.replace(':taskId', task._id)}`} 
                                className="fw-medium text-decoration-none"
                                style={{ color: 'inherit', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1B84FF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                              >
                                {task.name}
                              </Link>
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

            {/* Error messages */}
            {(error.users || error.projects || error.tasks) && (
              <div className="alert alert-danger mt-3" role="alert">
                <h5 className="alert-heading">
                  <i className="ti ti-alert-circle me-2"></i>
                  Dashboard Data Loading Error
                </h5>
                <p className="mb-0">
                  There was a problem loading some dashboard data. Please try refreshing the page or contact support if the problem persists.
                </p>
                {error.users && <p className="mt-2 small">{error.users}</p>}
              </div>
            )}

            {/* Group-specific Error messages */}
            {error.groups && typeof error.groups === 'object' && Object.keys(error.groups).length > 0 && (
              <div className="alert alert-warning mt-3" role="alert">
                <h5 className="alert-heading">
                  <i className="ti ti-alert-triangle me-2"></i>
                  Some group data could not be loaded
                </h5>
                <p className="mb-0">The dashboard is still functional, but some student information might be incomplete.</p>
                <hr />
                <ul className="mb-0 small">
                  {Object.entries(error.groups).map(([projectId, message]) => (
                    <li key={projectId}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projects */}
            <div className="row">
              <div className="col-12 d-flex">
                <div className="card flex-fill">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Your Assigned Projects</h5>
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
                            <th>Students</th>
                            <th>Tasks</th>
                            <th>Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.length > 0 ? (
                            projects.map(project => {
                              // Count students from groups for this project
                              const projectStudentsFromGroups = studentsFromGroups.filter(
                                student => student.projectId === project._id
                              ).length;

                              // Also count directly assigned students for backward compatibility
                              const directlyAssignedStudents = users.filter(user =>
                                user.projects?.some((p: any) => p._id === project._id)
                              ).length;

                              // Use group-based count if available, otherwise fall back to direct assignments
                              const projectStudentCount = projectStudentsFromGroups > 0
                                ? projectStudentsFromGroups
                                : directlyAssignedStudents;

                              const projectTaskCount = projectTaskCounts[project._id || '']?.total || 0;
                              const completedTasks = projectTaskCounts[project._id || '']?.completed || 0;
                              const progress = projectTaskCount > 0
                                ? Math.round((completedTasks / projectTaskCount) * 100)
                                : 0;

                              // Get groups for this project
                              const groups = projectGroups[project._id || ''] || [];
                              const groupCount = groups.length;

                              // Count total students across all groups for this project
                              const totalStudentsInGroups = groups.reduce((total, group) => 
                                total + (group.id_students?.length || 0), 0);

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
                                <tr key={project._id}>
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
                                  <td>
                                    {totalStudentsInGroups > 0 ? totalStudentsInGroups : projectStudentCount}
                                    {groupCount > 0 && (
                                      <small className="d-block text-muted">
                                        in {groupCount} group{groupCount !== 1 ? 's' : ''}
                                      </small>
                                    )}
                                  </td>
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
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center">
                                {loading.projects ? 'Loading projects...' : (
                                  <>
                                    <i className="ti ti-folder-off fs-3 text-muted mb-3 d-block mt-3"></i>
                                    <p className="mb-1">No projects found.</p>
                                    <p className="text-muted mb-3">
                                      {assignedProjectIds.length > 0
                                        ? "There was an issue loading your assigned projects."
                                        : "You don't have any assigned projects yet. Contact an administrator to get projects assigned to you."}
                                    </p>
                                  </>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Students in Your Projects */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                    <h5 className="mb-2">Students in Your Projects</h5>
                    <div className="d-flex align-items-center">
                      <select
                        className="form-select form-select-sm me-2"
                        id="projectFilter"
                        value={selectedProjectFilter}
                        onChange={(e) => {
                          setSelectedProjectFilter(e.target.value);
                          console.log("Filter by project:", e.target.value);
                        }}
                      >
                        <option value="">All Projects</option>
                        {projects.map(project => (
                          <option key={project._id} value={project._id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                      <span className="badge bg-primary">
                        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    {loading.studentsFromGroups ? (
                      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading students...</span>
                        </div>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div>
                        {/* Group students by project */}
                        {projects.map(project => {
                          // Get students for this project from filtered students
                          const projectStudents = filteredStudents.filter(
                            student => student.projectId === project._id
                          );

                          if (projectStudents.length === 0) return null;

                          return (
                            <div key={project._id} className="mb-4">
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="border-bottom pb-2 mb-0">
                                  <i className="ti ti-folder me-2 text-primary"></i>
                                  {project.title}
                                  <span className="badge bg-info ms-2">
                                    {projectStudents.length} student{projectStudents.length !== 1 ? 's' : ''}
                                  </span>
                                </h6>
                                <span className="badge bg-secondary">
                                  {project.speciality || 'Unspecified'}
                                </span>
                              </div>

                              {/* Group students by group within this project */}
                              {Object.entries(
                                projectStudents.reduce<Record<string, StudentWithProjectInfo[]>>((groups, student) => {
                                  const groupName = student.groupName || 'Unassigned';
                                  if (!groups[groupName]) {
                                    groups[groupName] = [];
                                  }
                                  groups[groupName].push(student);
                                  return groups;
                                }, {})
                              ).map(([groupName, groupStudents]: [string, StudentWithProjectInfo[]]) => (
                                <div key={groupName} className="mb-4">
                                  <div className="card border">
                                    <div className="card-header bg-light py-2">
                                      <h6 className="mb-0 d-flex align-items-center">
                                        <i className="ti ti-users me-2 text-info"></i>
                                        Group: {groupName}
                                        <span className="badge bg-primary ms-2">
                                          {groupStudents.length} student{groupStudents.length !== 1 ? 's' : ''}
                                        </span>
                                      </h6>
                                    </div>
                                    <div className="card-body p-0">
                                      <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                          <thead>
                                            <tr>
                                              <th>Name</th>
                                              <th>Email</th>
                                              <th>Specialty</th>
                                              <th>Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {groupStudents.map((student: StudentWithProjectInfo, index: number) => (
                                              <tr key={student._id || index}>
                                                <td className="align-middle">
                                                  <div className="d-flex align-items-center">
                                                    <div className="avatar avatar-sm me-2 flex-shrink-0">
                                                      <span className="avatar-text rounded-circle bg-primary">
                                                        {student.name ? student.name.charAt(0) : '?'}{student.lastname ? student.lastname.charAt(0) : '?'}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <h6 className="mb-0">{student.name || 'Unknown'} {student.lastname || ''}</h6>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="align-middle">{student.email || 'No email'}</td>
                                                <td className="align-middle">
                                                  <span className="badge bg-light text-dark">
                                                    {student.speciality || 'Not specified'}
                                                  </span>
                                                </td>
                                                <td className="align-middle">
                                                  <div className="d-flex">
                                                    <button
                                                      className="btn btn-sm btn-outline-primary me-1"
                                                      onClick={() => {
                                                        // View student details
                                                        console.log("View student:", student);
                                                      }}
                                                    >
                                                      <i className="ti ti-eye"></i>
                                                    </button>
                                                    <button
                                                      className="btn btn-sm btn-outline-info"
                                                      onClick={() => {
                                                        // Contact student
                                                        console.log("Contact student:", student);
                                                      }}
                                                    >
                                                      <i className="ti ti-mail"></i>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <i className="ti ti-users-off fs-3 text-muted mb-3 d-block"></i>
                        {selectedProjectFilter ? (
                          <>
                            <p className="mb-1">No students found in the selected project.</p>
                            <p className="text-muted">Try selecting a different project or check if students are assigned to groups in this project.</p>
                          </>
                        ) : (
                          <>
                            <p className="mb-1">No students found in your assigned projects.</p>
                            <p className="text-muted">Students will appear here when they are assigned to groups in your projects.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

        {/* Modals */}
        <ProjectModals />
        <RequestModals />
        <TodoModal />
      </>
  );
};

export default TutorDashboard;
