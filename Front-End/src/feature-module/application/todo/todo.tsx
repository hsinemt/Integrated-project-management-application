import React, { useState, useEffect } from "react";
import {Link, Navigate, useNavigate} from "react-router-dom";
import TodoModal from "../../../core/modals/todoModal";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { route } from "../../../core/common/selectoption/selectoption";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { getTasksAssignedToCurrentUser, TaskType } from "../../../api/projectsApi/task/taskApi";

const Todo = () => {
  // All useState hooks must be called at the top level
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highPriorityTasks, setHighPriorityTasks] = useState<TaskType[]>([]);
  const [mediumPriorityTasks, setMediumPriorityTasks] = useState<TaskType[]>([]);
  const [lowPriorityTasks, setLowPriorityTasks] = useState<TaskType[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);

  // Collapse state
  const [collapseHighPriority, setCollapseHighPriority] = useState<boolean>(true);
  const [collapseMediumPriority, setCollapseMediumPriority] = useState<boolean>(true);
  const [collapseLowPriority, setCollapseLowPriority] = useState<boolean>(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const toggleDescription = () => setShowFullDescription(prev => !prev);

  const getTruncatedText = (text: string, maxLength: number) =>
      text.length > maxLength ? text.slice(0, maxLength) + '...' : text;

  // Check if user has the student role
  const userRole = localStorage.getItem('role');
  const isStudent = userRole === 'student';

  // Function to sort tasks by due date (most urgent first)
  const sortTasksByDueDate = (tasks: TaskType[]) => {
    return [...tasks].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime(); // Ascending order (earliest first)
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to check if a task is overdue
  const isTaskOverdue = (dateString: string) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    return taskDate < today && taskDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
  };

  // Function to filter tasks by search query
  const filterTasksBySearch = (taskList: TaskType[]) => {
    if (!searchQuery) return taskList;

    return taskList.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Function to fetch tasks with retry capability
  const fetchTasksWithRetry = async (retryCount = 0, maxRetries = 3) => {
    try {
      setLoading(true);
      setError(null);

      const userTasks = await getTasksAssignedToCurrentUser();
      setTasks(userTasks);

      // Filter tasks by priority and sort by due date
      setHighPriorityTasks(sortTasksByDueDate(userTasks.filter(task => task.priority === 'High')));
      setMediumPriorityTasks(sortTasksByDueDate(userTasks.filter(task => task.priority === 'Medium')));
      setLowPriorityTasks(sortTasksByDueDate(userTasks.filter(task => task.priority === 'Low')));

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);

      if (retryCount < maxRetries) {
        // Retry after a delay (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        setError(`Failed to fetch tasks. Retrying in ${delay/1000} seconds...`);

        setTimeout(() => {
          fetchTasksWithRetry(retryCount + 1, maxRetries);
        }, delay);
      } else {
        setError(`Failed to fetch tasks after ${maxRetries} attempts. Please try again later.`);
        setLoading(false);
      }
    }
  };

  // useEffect must be called at the top level, before any conditional returns
  useEffect(() => {
    // Only fetch tasks if the user is a student
    if (isStudent) {
      fetchTasksWithRetry();
    }
  }, [isStudent]);

  // Handle task status toggle
  const toggleTaskStatus = (taskId: string, currentStatus: string) => {
    // In a real implementation, this would call an API to update the task status
    // For now, we'll just update the local state
    setTasks(prevTasks =>
        prevTasks.map(task =>
            task._id === taskId
                ? { ...task, état: currentStatus === 'Completed' ? 'To Do' : 'Completed' }
                : task
        )
    );
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Handle load more button click
  const handleLoadMore = () => {
    setShowAllTasks(true);
  };

  // Toggle collapse functions
  const toggleHighPriorityCollapse = () => {
    setCollapseHighPriority(!collapseHighPriority);
  };

  const toggleMediumPriorityCollapse = () => {
    setCollapseMediumPriority(!collapseMediumPriority);
  };

  const toggleLowPriorityCollapse = () => {
    setCollapseLowPriority(!collapseLowPriority);
  };

  // Get total filtered tasks count
  const getTotalFilteredTasksCount = () => {
    let count = 0;
    if (activeFilter === 'all' || activeFilter === 'high') {
      count += filterTasksBySearch(highPriorityTasks).length;
    }
    if (activeFilter === 'all' || activeFilter === 'medium') {
      count += filterTasksBySearch(mediumPriorityTasks).length;
    }
    if (activeFilter === 'all' || activeFilter === 'low') {
      count += filterTasksBySearch(lowPriorityTasks).length;
    }
    return count;
  };

  // Get all filtered tasks in a single array
  const getAllFilteredTasks = () => {
    let allTasks: TaskType[] = [];

    if (activeFilter === 'all' || activeFilter === 'high') {
      allTasks = [...allTasks, ...filterTasksBySearch(highPriorityTasks)];
    }
    if (activeFilter === 'all' || activeFilter === 'medium') {
      allTasks = [...allTasks, ...filterTasksBySearch(mediumPriorityTasks)];
    }
    if (activeFilter === 'all' || activeFilter === 'low') {
      allTasks = [...allTasks, ...filterTasksBySearch(lowPriorityTasks)];
    }

    return allTasks;
  };

  // Get tasks for display with limited count if needed
  const getTasksForDisplay = (tasks: TaskType[]) => {
    if (showAllTasks) {
      return tasks;
    }
    return tasks.slice(0, 3);
  };

  // If user is not a student, redirect to unauthorized page
  if (!isStudent) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
      <>
        <>
          {/* Page Wrapper */}
          <div className="page-wrapper">
            <div className="content">
              {/* Breadcrumb */}
              <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                <div className="my-auto mb-2">
                  <h2 className="mb-1">Todo</h2>
                  <nav>
                    <ol className="breadcrumb mb-0">
                      <li className="breadcrumb-item">
                        <Link to={all_routes.adminDashboard}>
                          <i className="ti ti-smart-home" />
                        </Link>
                      </li>
                      <li className="breadcrumb-item">Application</li>
                      <li className="breadcrumb-item active" aria-current="page">
                        Todo
                      </li>
                    </ol>
                  </nav>
                </div>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                  <div className="d-flex align-items-center border rounded p-1 me-2">
                    <Link to={all_routes.TodoList} className="btn btn-icon btn-sm">
                      <i className="ti ti-list-tree" />
                    </Link>
                    <Link
                        to={all_routes.todo}
                        className="btn btn-icon btn-sm active bg-primary text-white"
                    >
                      <i className="ti ti-table" />
                    </Link>
                  </div>
                  <div className="">
                    <div className="input-icon-start position-relative">
                    <span className="input-icon-addon">
                      <i className="ti ti-search" />
                    </span>
                      <input
                          type="text"
                          className="form-control"
                          placeholder="Search Todo List"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="ms-2 mb-0 head-icons">
                    <CollapseHeader />
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="row gy-3 mb-3">
                    <div className="col-sm-4">
                      <div className="d-flex align-items-center">
                        <h4>My Tasks</h4>
                        <span className="badge badge-dark rounded-pill badge-xs ms-2">
                        {tasks.length}
                      </span>
                      </div>
                    </div>
                    <div className="col-sm-8">
                      <div className="d-flex align-items-center justify-content-end">
                        <p className="mb-0 me-3 pe-3 border-end fs-14">
                          Total Task : <span className="text-dark"> {tasks.length} </span>
                        </p>
                        <p className="mb-0 me-3 pe-3 border-end fs-14">
                          Pending : <span className="text-dark"> {tasks.filter(task => task.état !== 'Completed').length} </span>
                        </p>
                        <p className="mb-0 fs-14">
                          Completed : <span className="text-dark"> {tasks.filter(task => task.état === 'Completed').length} </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  {loading && (
                      <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading your tasks...</p>
                      </div>
                  )}
                  {error && (
                      <div className="alert alert-danger" role="alert">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>{error}</div>
                          <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => fetchTasksWithRetry()}
                          >
                            <i className="ti ti-refresh me-1"></i> Retry
                          </button>
                        </div>
                      </div>
                  )}
                  <div className="row border-bottom mb-3">
                    <div className="col-lg-6">
                      <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                        <h6 className="me-2">Priority</h6>
                        <ul
                            className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs"
                            id="pills-tab"
                            role="tablist"
                        >
                          <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('all')}
                                type="button"
                                role="tab"
                                aria-selected={activeFilter === 'all'}
                            >
                              All
                            </button>
                          </li>
                          <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === 'high' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('high')}
                                type="button"
                                role="tab"
                                aria-selected={activeFilter === 'high'}
                            >
                              High
                            </button>
                          </li>
                          <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === 'medium' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('medium')}
                                type="button"
                                role="tab"
                                aria-selected={activeFilter === 'medium'}
                            >
                              Medium
                            </button>
                          </li>
                          <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === 'low' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('low')}
                                type="button"
                                role="tab"
                                aria-selected={activeFilter === 'low'}
                            >
                              Low
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                    {/*<div className="col-lg-6">*/}
                    {/*  <div className="d-flex align-items-center justify-content-lg-end flex-wrap row-gap-3 mb-3">*/}
                    {/*    <div className="d-flex align-items-center">*/}
                    {/*      <span className="d-inline-flex me-2">Sort By : </span>*/}
                    {/*      <div className="dropdown">*/}
                    {/*        <Link*/}
                    {/*            to="#"*/}
                    {/*            className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"*/}
                    {/*            data-bs-toggle="dropdown"*/}
                    {/*        >*/}
                    {/*          Due Date*/}
                    {/*        </Link>*/}
                    {/*        <ul className="dropdown-menu dropdown-menu-end p-3">*/}
                    {/*          <li>*/}
                    {/*            <Link*/}
                    {/*                to="#"*/}
                    {/*                className="dropdown-item rounded-1"*/}
                    {/*            >*/}
                    {/*              Due Date*/}
                    {/*            </Link>*/}
                    {/*          </li>*/}
                    {/*          <li>*/}
                    {/*            <Link*/}
                    {/*                to="#"*/}
                    {/*                className="dropdown-item rounded-1"*/}
                    {/*            >*/}
                    {/*              Priority*/}
                    {/*            </Link>*/}
                    {/*          </li>*/}
                    {/*          <li>*/}
                    {/*            <Link*/}
                    {/*                to="#"*/}
                    {/*                className="dropdown-item rounded-1"*/}
                    {/*            >*/}
                    {/*              Created Date*/}
                    {/*            </Link>*/}
                    {/*          </li>*/}
                    {/*        </ul>*/}
                    {/*      </div>*/}
                    {/*    </div>*/}
                    {/*  </div>*/}
                    {/*</div>*/}
                  </div>

                  <div className="tab-content" id="pills-tabContent">
                    <div
                        className="tab-pane fade show active"
                        id="pills-home"
                        role="tabpanel"
                    >
                      {!loading && tasks.length === 0 && (
                          <div className="text-center my-5">
                            <i className="ti ti-clipboard-check fs-1 text-muted"></i>
                            <h5 className="mt-3">No Tasks Found</h5>
                            <p className="text-muted">You don't have any tasks assigned yet.</p>
                          </div>
                      )}

                      {/* Show High Priority Tasks */}
                      {(activeFilter === 'all' || activeFilter === 'high') && highPriorityTasks.length > 0 && (
                          <div className="accordion todo-accordion" id="accordionHighPriority">
                            <div className="accordion-item mb-3">
                              <div className="row align-items-center mb-3 row-gap-3">
                                <div className="col-lg-4 col-sm-6">
                                  <div className="accordion-header" id="headingHigh">
                                    <div
                                        className={`accordion-button ${!collapseHighPriority ? 'collapsed' : ''}`}
                                        onClick={toggleHighPriorityCollapse}
                                        style={{ cursor: 'pointer' }}
                                    >
                                      <div className="d-flex align-items-center w-100">
                                        <div className="me-2">
                                          <Link to="#" onClick={(e) => { e.preventDefault(); toggleHighPriorityCollapse(); }}>
                                            <span>
                                              <i className={`fas fa-chevron-${collapseHighPriority ? 'down' : 'right'}`} />
                                            </span>
                                          </Link>
                                        </div>
                                        <div className="d-flex align-items-center">
                                          <span>
                                            <i className="ti ti-square-rounded text-purple me-2" />
                                          </span>
                                          <h5 className="fw-semibold">High</h5>
                                          <span className="badge bg-light rounded-pill ms-2">
                                            {filterTasksBySearch(highPriorityTasks).length}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                  id="collapseHigh"
                                  className={`accordion-collapse collapse ${collapseHighPriority ? 'show' : ''}`}
                                  aria-labelledby="headingHigh"
                                  data-bs-parent="#accordionHighPriority"
                              >
                                <div className="accordion-body">
                                  <div className="list-group list-group-flush border-bottom pb-2">
                                    {getTasksForDisplay(filterTasksBySearch(highPriorityTasks)).map((task) => (
                                        <div className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3" key={task._id}>
                                          <div className="row align-items-center row-gap-3">
                                            <div className="col-lg-6 col-md-7">
                                              <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                                <span className="me-2 d-flex align-items-center">
                                                  <i className="ti ti-grid-dots text-dark" />
                                                </span>
                                                <div className="form-check form-check-md me-2">
                                                  <input
                                                      className="form-check-input"
                                                      type="checkbox"
                                                      checked={task.état === 'Completed'}
                                                      onChange={() => toggleTaskStatus(task._id, task.état)}
                                                  />
                                                </div>
                                                <span className="me-2 d-flex align-items-center rating-select">
                                                  <i className={`ti ti-star${task.état !== 'Completed' ? '-filled filled' : ''}`} />
                                                </span>
                                                <div className={`strike-info ${task.état === 'Completed' ? 'todo-strike-content' : ''}`}>
                                                  <h4
                                                      className="fs-14"
                                                      style={{ cursor: 'pointer' }}
                                                      onClick={() => navigate(`/task-details/${task._id}`)}
                                                  >
                                                    {task.name}
                                                  </h4>
                                                  <p
                                                      className="text-muted mb-0"
                                                      style={{ cursor: 'pointer', lineHeight: '1.5' }}
                                                      onClick={toggleDescription}
                                                      title="Click to expand"
                                                  >
                                                    {showFullDescription ? task.description : getTruncatedText(task.description, 100)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="col-lg-6 col-md-5">
                                              <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                                <span className={`badge ${getStatusBadgeClass(task.état)} d-inline-flex align-items-center me-3`}>
                                                  <i className="fas fa-circle fs-6 me-1" />
                                                  {task.état}
                                                </span>
                                                <div className="d-flex align-items-center">
                                                  <div className="dropdown ms-2">
                                                    <Link
                                                        to="#"
                                                        className="d-inline-flex align-items-center"
                                                        data-bs-toggle="dropdown"
                                                    >
                                                      <i className="ti ti-dots-vertical" />
                                                    </Link>
                                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#add_todo"
                                                        >
                                                          <i className="ti ti-edit me-2" />
                                                          Edit
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#delete_modal"
                                                        >
                                                          <i className="ti ti-trash me-2" />
                                                          Delete
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#view_todo"
                                                        >
                                                          <i className="ti ti-eye me-2" />
                                                          View
                                                        </Link>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                    ))}
                                    {filterTasksBySearch(highPriorityTasks).length === 0 && (
                                        <div className="text-center py-3">
                                          <p className="text-muted">No high priority tasks found</p>
                                        </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      )}

                      {/* Show Medium Priority Tasks */}
                      {(activeFilter === 'all' || activeFilter === 'medium') && mediumPriorityTasks.length > 0 && (
                          <div className="accordion todo-accordion" id="accordionMediumPriority">
                            <div className="accordion-item mb-3">
                              <div className="row align-items-center mb-3 row-gap-3">
                                <div className="col-lg-4 col-sm-6">
                                  <div className="accordion-header" id="headingMedium">
                                    <div
                                        className={`accordion-button ${!collapseMediumPriority ? 'collapsed' : ''}`}
                                        onClick={toggleMediumPriorityCollapse}
                                        style={{ cursor: 'pointer' }}
                                    >
                                      <div className="d-flex align-items-center w-100">
                                        <div className="me-2">
                                          <Link to="#" onClick={(e) => { e.preventDefault(); toggleMediumPriorityCollapse(); }}>
                                            <span>
                                              <i className={`fas fa-chevron-${collapseMediumPriority ? 'down' : 'right'}`} />
                                            </span>
                                          </Link>
                                        </div>
                                        <div className="d-flex align-items-center">
                                          <span>
                                            <i className="ti ti-square-rounded text-warning me-2" />
                                          </span>
                                          <h5 className="fw-semibold">Medium</h5>
                                          <span className="badge bg-light rounded-pill ms-2">
                                            {filterTasksBySearch(mediumPriorityTasks).length}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                  id="collapseMedium"
                                  className={`accordion-collapse collapse ${collapseMediumPriority ? 'show' : ''}`}
                                  aria-labelledby="headingMedium"
                                  data-bs-parent="#accordionMediumPriority"
                              >
                                <div className="accordion-body">
                                  <div className="list-group list-group-flush border-bottom pb-2">
                                    {getTasksForDisplay(filterTasksBySearch(mediumPriorityTasks)).map((task) => (
                                        <div className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3" key={task._id}>
                                          <div className="row align-items-center row-gap-3">
                                            <div className="col-lg-6 col-md-7">
                                              <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                                <span className="me-2 d-flex align-items-center">
                                                  <i className="ti ti-grid-dots text-dark" />
                                                </span>
                                                <div className="form-check form-check-md me-2">
                                                  <input
                                                      className="form-check-input"
                                                      type="checkbox"
                                                      checked={task.état === 'Completed'}
                                                      onChange={() => toggleTaskStatus(task._id, task.état)}
                                                  />
                                                </div>
                                                <span className="me-2 rating-select d-flex align-items-center">
                                                  <i className={`ti ti-star${task.état !== 'Completed' ? '-filled filled' : ''}`} />
                                                </span>
                                                <div className={`strike-info ${task.état === 'Completed' ? 'todo-strike-content' : ''}`}>
                                                  <h4
                                                      className="fs-14"
                                                      style={{ cursor: 'pointer' }}
                                                      onClick={() => navigate(`/task-details/${task._id}`)}
                                                  >
                                                    {task.name}
                                                  </h4>
                                                  <p
                                                      className="text-muted mb-0"
                                                      style={{ cursor: 'pointer', lineHeight: '1.5' }}
                                                      onClick={toggleDescription}
                                                      title="Click to expand"
                                                  >
                                                    {showFullDescription ? task.description : getTruncatedText(task.description, 100)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="col-lg-6 col-md-5">
                                              <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                                <span className={`badge ${getStatusBadgeClass(task.état)} d-inline-flex align-items-center me-3`}>
                                                  <i className="fas fa-circle fs-6 me-1" />
                                                  {task.état}
                                                </span>
                                                <div className="d-flex align-items-center">
                                                  <div className="dropdown ms-2">
                                                    <Link
                                                        to="#"
                                                        className="d-inline-flex align-items-center"
                                                        data-bs-toggle="dropdown"
                                                    >
                                                      <i className="ti ti-dots-vertical" />
                                                    </Link>
                                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#add_todo"
                                                        >
                                                          <i className="ti ti-edit me-2" />
                                                          Edit
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#delete_modal"
                                                        >
                                                          <i className="ti ti-trash me-2" />
                                                          Delete
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#view_todo"
                                                        >
                                                          <i className="ti ti-eye me-2" />
                                                          View
                                                        </Link>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                    ))}
                                    {filterTasksBySearch(mediumPriorityTasks).length === 0 && (
                                        <div className="text-center py-3">
                                          <p className="text-muted">No medium priority tasks found</p>
                                        </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      )}

                      {/* Show Low Priority Tasks */}
                      {(activeFilter === 'all' || activeFilter === 'low') && lowPriorityTasks.length > 0 && (
                          <div className="accordion todo-accordion" id="accordionLowPriority">
                            <div className="accordion-item mb-3">
                              <div className="row align-items-center mb-3 row-gap-3">
                                <div className="col-lg-4 col-sm-6">
                                  <div className="accordion-header" id="headingLow">
                                    <div
                                        className={`accordion-button ${!collapseLowPriority ? 'collapsed' : ''}`}
                                        onClick={toggleLowPriorityCollapse}
                                        style={{ cursor: 'pointer' }}
                                    >
                                      <div className="d-flex align-items-center w-100">
                                        <div className="me-2">
                                          <Link to="#" onClick={(e) => { e.preventDefault(); toggleLowPriorityCollapse(); }}>
                                            <span>
                                              <i className={`fas fa-chevron-${collapseLowPriority ? 'down' : 'right'}`} />
                                            </span>
                                          </Link>
                                        </div>
                                        <div className="d-flex align-items-center">
                                          <span>
                                            <i className="ti ti-square-rounded text-success me-2" />
                                          </span>
                                          <h5 className="fw-semibold">Low</h5>
                                          <span className="badge bg-light rounded-pill ms-2">
                                            {filterTasksBySearch(lowPriorityTasks).length}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                  id="collapseLow"
                                  className={`accordion-collapse collapse ${collapseLowPriority ? 'show' : ''}`}
                                  aria-labelledby="headingLow"
                                  data-bs-parent="#accordionLowPriority"
                              >
                                <div className="accordion-body">
                                  <div className="list-group list-group-flush">
                                    {getTasksForDisplay(filterTasksBySearch(lowPriorityTasks)).map((task) => (
                                        <div className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3" key={task._id}>
                                          <div className="row align-items-center row-gap-3">
                                            <div className="col-lg-6 col-md-7">
                                              <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                                <span className="me-2 d-flex align-items-center">
                                                  <i className="ti ti-grid-dots text-dark" />
                                                </span>
                                                <div className="form-check form-check-md me-2">
                                                  <input
                                                      className="form-check-input"
                                                      type="checkbox"
                                                      checked={task.état === 'Completed'}
                                                      onChange={() => toggleTaskStatus(task._id, task.état)}
                                                  />
                                                </div>
                                                <span className="me-2 rating-select d-flex align-items-center">
                                                  <i className={`ti ti-star${task.état !== 'Completed' ? '-filled filled' : ''}`} />
                                                </span>
                                                <div className={`strike-info ${task.état === 'Completed' ? 'todo-strike-content' : ''}`}>
                                                  <h4
                                                      className="fs-14"
                                                      style={{ cursor: 'pointer' }}
                                                      onClick={() => navigate(`/task-details/${task._id}`)}
                                                  >
                                                    {task.name}
                                                  </h4>
                                                  <p
                                                      className="text-muted mb-0"
                                                      style={{ cursor: 'pointer', lineHeight: '1.5' }}
                                                      onClick={toggleDescription}
                                                      title="Click to expand"
                                                  >
                                                    {showFullDescription ? task.description : getTruncatedText(task.description, 100)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="col-lg-6 col-md-5">
                                              <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                                <span className={`badge ${getStatusBadgeClass(task.état)} d-inline-flex align-items-center me-3`}>
                                                  <i className="fas fa-circle fs-6 me-1" />
                                                  {task.état}
                                                </span>
                                                <div className="d-flex align-items-center">
                                                  <div className="dropdown ms-2">
                                                    <Link
                                                        to="#"
                                                        className="d-inline-flex align-items-center"
                                                        data-bs-toggle="dropdown"
                                                    >
                                                      <i className="ti ti-dots-vertical" />
                                                    </Link>
                                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#add_todo"
                                                        >
                                                          <i className="ti ti-edit me-2" />
                                                          Edit
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#delete_modal"
                                                        >
                                                          <i className="ti ti-trash me-2" />
                                                          Delete
                                                        </Link>
                                                      </li>
                                                      <li>
                                                        <Link
                                                            to="#"
                                                            className="dropdown-item rounded-1"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#view_todo"
                                                        >
                                                          <i className="ti ti-eye me-2" />
                                                          View
                                                        </Link>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                    ))}
                                    {filterTasksBySearch(lowPriorityTasks).length === 0 && (
                                        <div className="text-center py-3">
                                          <p className="text-muted">No low priority tasks found</p>
                                        </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>

                  {getTotalFilteredTasksCount() > 3 && !showAllTasks && (
                      <div className="text-center">
                        <Link to="#" className="btn btn-primary" onClick={handleLoadMore}>
                          <i className="ti ti-loader me-2" />
                          Load More
                        </Link>
                      </div>
                  )}
                </div>
              </div>
            </div>
            <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
              <p className="mb-0">2014 - 2025 © SmartHR.</p>
              <p>
                Designed &amp; Developed By{" "}
                <Link to="#" className="text-primary">
                  Dreams
                </Link>
              </p>
            </div>
          </div>
          {/* /Page Wrapper */}
        </>

        <TodoModal />
      </>
  );
};

// Helper function to get badge class based on task status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'badge-soft-success';
    case 'In Progress':
      return 'bg-transparent-purple';
    case 'In Review':
      return 'bg-transparent-info';
    case 'To Do':
      return 'badge-soft-secondary';
    default:
      return 'badge-soft-secondary';
  }
};

export default Todo;