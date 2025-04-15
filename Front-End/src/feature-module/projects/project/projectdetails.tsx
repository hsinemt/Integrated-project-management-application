import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import {
    getProjectById,
    ProjectType,
    TutorType,
    getAllTutors,
    assignTutorToProject
} from "../../../api/projectsApi/project/projectApi";
import { getTasksByProjectId, TaskType, updateTaskStatus } from "../../../api/projectsApi/task/taskApi";

const ProjectDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectType | null>(null);
    const [tasks, setTasks] = useState<TaskType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [tutors, setTutors] = useState<TutorType[]>([]);
    const [selectedTutorId, setSelectedTutorId] = useState<string>("");
    const [isManager, setIsManager] = useState<boolean>(false);
    const [assignLoading, setAssignLoading] = useState<boolean>(false);
    const [assignSuccess, setAssignSuccess] = useState<boolean>(false);
    const [assignError, setAssignError] = useState<string | null>(null);

    useEffect(() => {

        const userRole = localStorage.getItem("role");
        // console.log("Current user role:", userRole);
        setIsManager(userRole === "manager");

        const fetchProjectDetails = async () => {
            if (!id) {
                setError("Project ID is missing");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const projectData = await getProjectById(id);
                setProject(projectData);

                const tasksData = await getTasksByProjectId(id);
                setTasks(tasksData);

                if (userRole === "manager") {
                    try {
                        const tutorsData = await getAllTutors();
                        setTutors(tutorsData);
                    } catch (err: any) {
                        console.error("Error fetching tutors:", err);

                    }
                }

                setLoading(false);
            } catch (err: any) {
                console.error("Error fetching project details:", err);
                setError(err.message || "Failed to load project details");
                setLoading(false);
            }
        };

        fetchProjectDetails();
    }, [id]);


    const handleTaskStatusChange = async (taskId: string, newStatus: 'To Do' | 'In Progress' | 'Completed' | 'In Review') => {
        try {
            const updatedTask = await updateTaskStatus(taskId, newStatus);

            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task._id === taskId ? { ...task, état: newStatus } : task
                )
            );
        } catch (err: any) {
            console.error("Error updating task status:", err);

        }
    };


    const handleAssignTutor = async () => {
        if (!selectedTutorId || !id) {
            setAssignError("Please select a tutor first");
            return;
        }

        setAssignLoading(true);
        setAssignError(null);
        setAssignSuccess(false);

        try {
            const response = await assignTutorToProject(id, selectedTutorId);

            if (response.success) {
                setAssignSuccess(true);

                if (response.data) {
                    setProject(response.data);
                } else {

                    const updatedProject = await getProjectById(id);
                    setProject(updatedProject);
                }
            } else {
                setAssignError(response.message || "Failed to assign tutor");
            }
        } catch (err: any) {
            console.error("Error assigning tutor:", err);
            setAssignError(err.message || "An error occurred while assigning the tutor");
        } finally {
            setAssignLoading(false);
        }
    };


    const completedTasks = tasks.filter(task => task.état === 'Completed').length;
    const totalTasks = tasks.length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;


    const handleGoToMotivations = () => {
        if (project && project._id) {
            navigate(`/motivations/${project._id}`);
        }
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="content container-fluid">
                    <div className="row">
                        <div className="col-12 text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2">Loading project details...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="page-wrapper">
                <div className="content container-fluid">
                    <div className="row">
                        <div className="col-12 text-center py-5">
                            <div className="alert alert-danger">
                                <i className="ti ti-alert-circle me-2"></i>
                                {error || "Project not found"}
                            </div>
                            <button
                                className="btn btn-primary mt-3"
                                onClick={() => navigate(all_routes.project)}
                            >
                                Back to Projects
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <>
            {/* Page Wrapper */}
            <div className="page-wrapper">
                <div className="content">
                    <div className="row align-items-center mb-4">
                        <div className="d-md-flex d-sm-block justify-content-between align-items-center flex-wrap">
                            <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                                <Link to={all_routes.project}>
                                    <i className="ti ti-arrow-left me-2" />
                                    Back to List
                                </Link>
                            </h6>
                            <div className="d-flex">
                                <div className="text-end">
                                    <Link
                                        to="#"
                                        className="btn btn-primary"
                                        data-bs-toggle="modal"
                                        data-bs-target="#edit_project"
                                        data-inert={true}
                                    >
                                        <i className="ti ti-edit me-1" />
                                        Edit Project
                                    </Link>
                                </div>
                                <div className="head-icons ms-2 text-end">
                                    <CollapseHeader />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-xxl-3 col-xl-4 theiaStickySidebar">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="mb-3">Project Details</h5>
                                    <div className="list-group details-list-group mb-4">
                                        <div className="list-group-item">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span>Created on</span>
                                                <p className="text-gray-9">
                                                    {project.createdAt
                                                        ? new Date(project.createdAt).toLocaleDateString()
                                                        : "14 Nov 2026"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="list-group-item">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span>Created by</span>
                                                <div className="d-flex align-items-center">
                                                    <span className="avatar avatar-sm avatar-rounded me-2">
                                                        {project.creator && project.creator.avatar ? (
                                                            <ImageWithBasePath
                                                                src={project.creator.avatar}
                                                                alt="Creator Avatar"
                                                            />
                                                        ) : (
                                                            <ImageWithBasePath
                                                                src="assets/img/profiles/avatar-02.jpg"
                                                                alt="Default Avatar"
                                                            />
                                                        )}
                                                    </span>
                                                    <p className="text-gray-9 mb-0">
                                                        {project.creator
                                                            ? `${project.creator.name} ${project.creator.lastname}`
                                                            : "Cameron"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Display assigned tutor if exists */}
                                        {project.assignedTutor && (
                                            <div className="list-group-item">
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <span>Assigned to</span>
                                                    <div className="d-flex align-items-center">
                                                        <span className="avatar avatar-sm avatar-rounded me-2">
                                                            {project.assignedTutor.avatar ? (
                                                                <ImageWithBasePath
                                                                    src={project.assignedTutor.avatar}
                                                                    alt="Tutor Avatar"
                                                                />
                                                            ) : (
                                                                <ImageWithBasePath
                                                                    src="assets/img/profiles/avatar-03.jpg"
                                                                    alt="Default Tutor Avatar"
                                                                />
                                                            )}
                                                        </span>
                                                        <p className="text-gray-9 mb-0">
                                                            {`${project.assignedTutor.name} ${project.assignedTutor.lastname}`}
                                                            <span className="d-block text-muted small">Tutor - {project.assignedTutor.classe || 'N/A'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="list-group-item">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span>Difficulty</span>
                                                <div className="dropdown">
                                                    <Link
                                                        to="#"
                                                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                                                        data-bs-toggle="dropdown"
                                                    >
                                                        <span className={`rounded-circle ${
                                                            project.difficulty === 'Hard' || project.difficulty === 'Very Hard'
                                                                ? 'bg-transparent-danger'
                                                                : project.difficulty === 'Medium'
                                                                    ? 'bg-transparent-warning'
                                                                    : 'bg-transparent-success'
                                                        } d-flex justify-content-center align-items-center me-2`}>
                                                            <i className={`ti ti-point-filled ${
                                                                project.difficulty === 'Hard' || project.difficulty === 'Very Hard'
                                                                    ? 'text-danger'
                                                                    : project.difficulty === 'Medium'
                                                                        ? 'text-warning'
                                                                        : 'text-success'
                                                            }`} />
                                                        </span>
                                                        {project.difficulty || "Medium"}
                                                    </Link>
                                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                                        <li>
                                                            <Link
                                                                to="#"
                                                                className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                                                            >
                                                                <span className="rounded-circle bg-transparent-success d-flex justify-content-center align-items-center me-2">
                                                                    <i className="ti ti-point-filled text-success" />
                                                                </span>
                                                                Easy
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                to="#"
                                                                className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                                                            >
                                                                <span className="rounded-circle bg-transparent-warning d-flex justify-content-center align-items-center me-2">
                                                                    <i className="ti ti-point-filled text-warning" />
                                                                </span>
                                                                Medium
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                to="#"
                                                                className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                                                            >
                                                                <span className="rounded-circle bg-transparent-danger d-flex justify-content-center align-items-center me-2">
                                                                    <i className="ti ti-point-filled text-danger" />
                                                                </span>
                                                                Hard
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                to="#"
                                                                className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                                                            >
                                                                <span className="rounded-circle bg-transparent-danger d-flex justify-content-center align-items-center me-2">
                                                                    <i className="ti ti-point-filled text-danger" />
                                                                </span>
                                                                Very Hard
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Manager-only section for tutor assignment - Only shown if user is a manager */}
                                    {localStorage.getItem("role") === "manager" && (
                                        <div className="mb-4">
                                            <h5 className="mb-3">Assign Tutor</h5>
                                            <div className="bg-light p-3 rounded">
                                                {project.assignedTutor ? (
                                                    <div className="mb-3">
                                                        <p className="mb-1">Currently assigned to:</p>
                                                        <div className="d-flex align-items-center">
                                                            <span className="avatar avatar-sm avatar-rounded me-2">
                                                                {project.assignedTutor.avatar ? (
                                                                    <ImageWithBasePath
                                                                        src={project.assignedTutor.avatar}
                                                                        alt="Tutor Avatar"
                                                                    />
                                                                ) : (
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-03.jpg"
                                                                        alt="Default Tutor Avatar"
                                                                    />
                                                                )}
                                                            </span>
                                                            <span>
                                                                {`${project.assignedTutor.name} ${project.assignedTutor.lastname}`}
                                                            </span>
                                                        </div>
                                                        <p className="text-muted small mt-2">To change assignment, select another tutor below</p>
                                                    </div>
                                                ) : (
                                                    <p className="mb-2">This project is not assigned to any tutor yet.</p>
                                                )}

                                                <select
                                                    className="form-select mb-3"
                                                    value={selectedTutorId}
                                                    onChange={(e) => setSelectedTutorId(e.target.value)}
                                                >
                                                    <option value="">Select a tutor</option>
                                                    {tutors.map((tutor) => (
                                                        <option key={tutor._id} value={tutor._id}>
                                                            {`${tutor.name} ${tutor.lastname} (${tutor.classe || 'No Class'})`}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    className="btn btn-primary w-100"
                                                    onClick={handleAssignTutor}
                                                    disabled={assignLoading || !selectedTutorId}
                                                >
                                                    {assignLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Assigning...
                                                        </>
                                                    ) : (
                                                        project.assignedTutor ? 'Reassign Project' : 'Assign Project'
                                                    )}
                                                </button>

                                                {assignSuccess && (
                                                    <div className="alert alert-success mt-3 mb-0">
                                                        <i className="ti ti-circle-check me-2"></i>
                                                        Project successfully assigned!
                                                    </div>
                                                )}

                                                {assignError && (
                                                    <div className="alert alert-danger mt-3 mb-0">
                                                        <i className="ti ti-alert-circle me-2"></i>
                                                        {assignError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <h5 className="mb-3">Tasks Details</h5>
                                    <div className="bg-light p-2 rounded">
                                        <span className="d-block mb-1">Tasks Done</span>
                                        <h4 className="mb-2">{completedTasks} / {totalTasks}</h4>
                                        <div className="progress progress-xs mb-2">
                                            <div
                                                className="progress-bar"
                                                role="progressbar"
                                                style={{ width: `${completionPercentage}%` }}
                                                aria-valuenow={completionPercentage}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                        <p>{completionPercentage}% Completed</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xxl-9 col-xl-8">
                            <div className="card">
                                <div className="card-body">
                                    <div className="bg-light rounded p-3 mb-3">
                                        <div className="d-flex align-items-center">
                                            <Link
                                                to="#"
                                                className="flex-shrink-0 me-2"
                                            >
                                                {project.projectLogo ? (
                                                    <img
                                                        src={project.projectLogo}
                                                        alt={project.title}
                                                        style={{ width: "60px", height: "60px" }}
                                                        className="rounded"
                                                    />
                                                ) : (
                                                    <ImageWithBasePath
                                                        src="assets/img/social/project-01.svg"
                                                        alt="Default Project Logo"
                                                    />
                                                )}
                                            </Link>
                                            <div>
                                                <h6 className="mb-1">
                                                    <button
                                                        onClick={handleGoToMotivations}
                                                        className="btn btn-link p-0 text-decoration-none"
                                                        style={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                                                    >
                                                        {project.title}
                                                    </button>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row align-items-center">
                                        <div className="col-sm-3">
                                            <p className="d-flex align-items-center mb-3">
                                                <i className="ti ti-square-rounded me-2" />
                                                Status
                                            </p>
                                        </div>
                                        <div className="col-sm-9">
                                            <span className={`badge ${
                                                project.status === 'In Progress'
                                                    ? 'badge-soft-purple'
                                                    : project.status === 'Completed'
                                                        ? 'badge-soft-success'
                                                        : project.status === 'On Hold'
                                                            ? 'badge-soft-warning'
                                                            : 'badge-soft-secondary'
                                            } d-inline-flex align-items-center mb-3`}>
                                                <i className="ti ti-point-filled me-1" />
                                                {project.status || "Not Started"}
                                            </span>
                                        </div>

                                        <div className="col-sm-3">
                                            <p className="d-flex align-items-center mb-3">
                                                <i className="ti ti-bookmark me-2" />
                                                Key Features
                                            </p>
                                        </div>
                                        <div className="col-sm-9">
                                            <div className="d-flex flex-wrap mb-3 gap-2">
                                                {project.keywords && project.keywords.map((keyword, index) => (
                                                    <Link
                                                        key={index}
                                                        to="#"
                                                        className="badge task-tag bg-pink rounded-pill"
                                                        style={{
                                                            whiteSpace: "normal",
                                                            fontWeight: "500",
                                                            padding: "6px 12px",
                                                            textDecoration: "none"
                                                        }}
                                                    >
                                                        {keyword}
                                                    </Link>
                                                ))}
                                                {(!project.keywords || project.keywords.length === 0) && (
                                                    <>
                                                        <Link
                                                            to="#"
                                                            className="badge task-tag bg-pink rounded-pill"
                                                            style={{ textDecoration: "none" }}
                                                        >
                                                            Admin Panel
                                                        </Link>
                                                        <Link
                                                            to="#"
                                                            className="badge task-tag badge-info rounded-pill"
                                                            style={{ textDecoration: "none" }}
                                                        >
                                                            High Tech
                                                        </Link>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-sm-12">
                                            <div className="mb-3">
                                                <h6 className="mb-1">Description</h6>
                                                <p>
                                                    {project.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="col-md-12">
                                            <div className="bg-soft-secondary p-3 rounded d-flex align-items-center justify-content-between">
                                                <p className="text-secondary mb-0">
                                                    Time Spent on this project
                                                </p>
                                                <h3 className="text-secondary">
                                                    65/120 <span className="fs-16">Hrs</span>
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tasks Section */}
                            <div className="custom-accordion-items">
                                <div
                                    className="accordion accordions-items-seperate"
                                    id="accordionExample"
                                >
                                    <div className="accordion-item">
                                        <div className="accordion-header" id="headingTwo">
                                            <div className="accordion-button">
                                                <h5>Tasks</h5>
                                                <div className="ms-auto">
                                                    <Link
                                                        to="#"
                                                        className="d-flex align-items-center collapsed collapse-arrow"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target="#primaryBorderTwo"
                                                        aria-expanded="false"
                                                        aria-controls="primaryBorderTwo"
                                                    >
                                                        <i className="ti ti-chevron-down fs-18" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            id="primaryBorderTwo"
                                            className="accordion-collapse collapse show border-top"
                                            aria-labelledby="headingTwo"
                                            data-bs-parent="#accordionExample"
                                        >
                                            <div className="accordion-body">
                                                <div className="list-group list-group-flush">
                                                    {tasks.length > 0 ? (
                                                        // Render dynamic tasks
                                                        tasks.map((task) => (
                                                            <div key={task._id} className="list-group-item border rounded mb-2 p-2">
                                                                <div className="row align-items-center row-gap-3">
                                                                    <div className="col-md-7">
                                                                        <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                                                            <span>
                                                                                <i className="ti ti-grid-dots me-2" />
                                                                            </span>
                                                                            <div className="form-check form-check-md me-2">
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    checked={task.état === 'Completed'}
                                                                                    onChange={(e) =>
                                                                                        handleTaskStatusChange(
                                                                                            task._id,
                                                                                            e.target.checked ? 'Completed' : 'To Do'
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            <span className="me-2 d-flex align-items-center rating-select">
                                                                                <i className={`ti ti-star${task.priority === 'High' ? '-filled filled' : ''}`} />
                                                                            </span>
                                                                            <div className="strike-info">
                                                                                <h4 className="fs-14">
                                                                                    {task.name}
                                                                                </h4>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-5">
                                                                        <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                                                            <span className={`badge ${
                                                                                task.état === 'In Progress'
                                                                                    ? 'bg-soft-purple'
                                                                                    : task.état === 'Completed'
                                                                                        ? 'bg-soft-success'
                                                                                        : task.état === 'In Review'
                                                                                            ? 'bg-soft-info'
                                                                                            : 'bg-soft-pink'
                                                                            } d-inline-flex align-items-center me-3`}>
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
                                                                                                data-bs-target="#edit_todo"
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
                                                        ))
                                                    ) : (
                                                        // Show a message when no tasks exist
                                                        <div className="text-center py-3">
                                                            <p>No tasks found for this project.</p>
                                                        </div>
                                                    )}

                                                    {/* Add 'New task' button */}
                                                    <button
                                                        className="btn bg-primary-transparent border-dashed border-primary w-100 text-start"
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#add_todo"
                                                        data-inert={true}
                                                    >
                                                        <i className="ti ti-plus me-2" />
                                                        New task
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
        </>
    );
};

export default ProjectDetails;