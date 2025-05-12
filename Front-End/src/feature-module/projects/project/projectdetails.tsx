import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import CommonTagsInput from "../../../core/common/Taginput";
import {
    getProjectById,
    ProjectType,
    TutorType,
    getAllTutors,
    assignTutorToProject,
    updateProject,
    getGroupsByProjectId,
    GroupType,
} from "../../../api/projectsApi/project/projectApi";
import { getTasksByProjectId, TaskType, updateTaskStatus } from "../../../api/projectsApi/task/taskApi";

const ProjectDetails = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [project, setProject] = useState<ProjectType | null>(location.state?.project || null);
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<TaskType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [tutors, setTutors] = useState<TutorType[]>([]);
    const [selectedTutorId, setSelectedTutorId] = useState<string>("");
    const [isManager, setIsManager] = useState<boolean>(false);
    const [assignLoading, setAssignLoading] = useState<boolean>(false);
    const [assignSuccess, setAssignSuccess] = useState<boolean>(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [groups, setGroups] = useState<GroupType[]>([]);
    const [groupsLoading, setGroupsLoading] = useState<boolean>(false);


    const [editActiveTab, setEditActiveTab] = useState<string>("basic-info");
    const [editFormData, setEditFormData] = useState<ProjectType | null>(null);
    const [editKeywords, setEditKeywords] = useState<string[]>([]);
    const [editSelectedAvatar, setEditSelectedAvatar] = useState<File | null>(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState<boolean>(false);


    const difficultyOptions = [
        { value: "Easy", label: "Easy" },
        { value: "Medium", label: "Medium" },
        { value: "Hard", label: "Hard" },
        { value: "Very Hard", label: "Very Hard" },
    ];

    const statusOptions = [
        { value: "Not Started", label: "Not Started" },
        { value: "In Progress", label: "In Progress" },
        { value: "On Hold", label: "On Hold" },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
    ];

    const specialityOptions = [
        { value: "Twin", label: "Twin" },
        { value: "ERP/BI", label: "ERP/BI" },
        { value: "AI", label: "AI" },
        { value: "SAE", label: "SAE" },
        { value: "SE", label: "SE" },
        { value: "SIM", label: "SIM" },
        { value: "NIDS", label: "NIDS" },
        { value: "SLEAM", label: "SLEAM" },
        { value: "GAMIX", label: "GAMIX" },
        { value: "WIN", label: "WIN" },
        { value: "IoSyS", label: "IoSyS" },
        { value: "ArcTic", label: "ArcTic" },
    ];

    useEffect(() => {
        const userRole = localStorage.getItem("role");
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

                // Fetch groups and students assigned to this project
                try {
                    setGroupsLoading(true);
                    const groupsData = await getGroupsByProjectId(id);
                    setGroups(groupsData);
                    setGroupsLoading(false);
                } catch (err: any) {
                    console.error("Error fetching groups:", err);
                    setGroupsLoading(false);
                }

                setLoading(false);
            } catch (err: any) {
                console.error("Error fetching project details:", err);
                setError(err.message || "Failed to load project details");
                setLoading(false);
            }
        };

        fetchProjectDetails();

        const editModal = document.getElementById("edit_project");
        const handleModalShow = () => {
            handleEditClick();
        };

        if (editModal) {
            editModal.addEventListener("show.bs.modal", handleModalShow);
        }

        return () => {
            if (editModal) {
                editModal.removeEventListener("show.bs.modal", handleModalShow);
            }
        };
    }, [id]);

    const handleTaskStatusChange = async (
        taskId: string,
        newStatus: "To Do" | "In Progress" | "Completed" | "In Review"
    ) => {
        try {
            await updateTaskStatus(taskId, newStatus);
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
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

    const handleEditClick = () => {
        if (!project) {
            console.error("No project data available to edit");
            return;
        }
        setEditFormData({
            ...project,
            keywords: project.keywords || [],
        });
        setEditKeywords(project.keywords || []);
        setEditActiveTab("basic-info");

        if (project.projectAvatar) {
            setEditAvatarPreview(`http://localhost:9777${project.projectAvatar}`);
        } else {
            setEditAvatarPreview(null);
        }
    };

    const handleEditInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        if (!editFormData) {
            console.error("editFormData is null");
            return;
        }
        setEditFormData({
            ...editFormData,
            [name]: value,
        });
    };

    const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEditSelectedAvatar(file);
            const previewUrl = URL.createObjectURL(file);
            setEditAvatarPreview(previewUrl);
        }
    };

    const clearEditAvatar = () => {
        setEditSelectedAvatar(null);
        if (editAvatarPreview && !project?.projectAvatar) {
            URL.revokeObjectURL(editAvatarPreview);
            setEditAvatarPreview(null);
        } else if (project?.projectAvatar) {
            // Ensure the path is correctly formatted for the server
            const avatarPath = project.projectAvatar.includes('/project-avatars/') 
                ? project.projectAvatar  // Keep as is if it already has the correct path
                : project.projectAvatar.replace('/uploads/', '/uploads/projects/');  // Fix path if needed

            setEditAvatarPreview(`http://localhost:9777${avatarPath}`);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!project?._id || !editFormData) {
            alert("No project selected for editing");
            return;
        }

        if (!editFormData.title || !editFormData.description || editKeywords.length === 0) {
            alert("Please fill all required fields");
            return;
        }

        setEditLoading(true);
        try {
            const submissionData = {
                ...editFormData,
                keywords: editKeywords,
            };

            const response = await updateProject(project._id, submissionData, editSelectedAvatar || undefined);

            if (response.success) {
                setProject(response.data || editFormData);
                const modal = document.getElementById("edit_project");
                if (modal) {
                    const modalInstance = window.bootstrap?.Modal.getInstance(modal);
                    modalInstance?.hide();
                }
            } else {
                alert(response.message || "Failed to update project");
            }
        } catch (error: any) {
            console.error("Error updating project:", error);
            alert(error.message || "An error occurred while updating the project");
        } finally {
            setEditLoading(false);
        }
    };

    const completedTasks = tasks.filter((task) => task.état === "Completed").length;
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
                                        onClick={handleEditClick}
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
                                                            <span className="d-block text-muted small">
                                                                Tutor - {project.assignedTutor.classe || "N/A"}
                                                            </span>
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
                                                        <span
                                                            className={`rounded-circle ${
                                                                project.difficulty === "Hard" ||
                                                                project.difficulty === "Very Hard"
                                                                    ? "bg-transparent-danger"
                                                                    : project.difficulty === "Medium"
                                                                        ? "bg-transparent-warning"
                                                                        : "bg-transparent-success"
                                                            } d-flex justify-content-center align-items-center me-2`}
                                                        >
                                                            <i
                                                                className={`ti ti-point-filled ${
                                                                    project.difficulty === "Hard" ||
                                                                    project.difficulty === "Very Hard"
                                                                        ? "text-danger"
                                                                        : project.difficulty === "Medium"
                                                                            ? "text-warning"
                                                                            : "text-success"
                                                                }`}
                                                            />
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

                                    {localStorage.getItem("role") === "manager"  && (
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
                                                        <p className="text-muted small mt-2">
                                                            To change assignment, select another tutor below
                                                        </p>
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
                                                            {`${tutor.name} ${tutor.lastname} (${tutor.classe || "No Class"})`}
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
                                                            <span
                                                                className="spinner-border spinner-border-sm me-2"
                                                                role="status"
                                                                aria-hidden="true"
                                                            ></span>
                                                            Assigning...
                                                        </>
                                                    ) : project.assignedTutor ? (
                                                        "Reassign Project"
                                                    ) : (
                                                        "Assign Project"
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
                                        <h4 className="mb-2">
                                            {completedTasks} / {totalTasks}
                                        </h4>
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
                                            <Link to="#" className="flex-shrink-0 me-2">
                                                {project.projectAvatar ? (
                                                    <img
                                                        src={`http://localhost:9777${project.projectAvatar.includes('/project-avatars/') 
                                                            ? project.projectAvatar 
                                                            : project.projectAvatar.replace('/uploads/', '/uploads/projects/')}`}
                                                        alt={project.title}
                                                        style={{ width: "60px", height: "60px", borderRadius: "50%" }} // Added borderRadius for fully rounded logo
                                                        className="rounded"
                                                        onError={(e) => {
                                                            console.error(`Failed to load image: ${project.projectAvatar}`);
                                                            const target = e.target as HTMLImageElement;
                                                            target.onerror = null;
                                                            target.src = "assets/img/social/project-01.svg";
                                                        }}
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
                                                        style={{ fontSize: "inherit", fontWeight: "inherit" }}
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
                                            <span
                                                className={`badge ${
                                                    project.status === "In Progress"
                                                        ? "badge-soft-purple"
                                                        : project.status === "Completed"
                                                            ? "badge-soft-success"
                                                            : project.status === "On Hold"
                                                                ? "badge-soft-warning"
                                                                : "badge-soft-secondary"
                                                } d-inline-flex align-items-center mb-3`}
                                            >
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
                                                {project.keywords &&
                                                    project.keywords.map((keyword, index) => (
                                                        <Link
                                                            key={index}
                                                            to="#"
                                                            className="badge task-tag bg-pink rounded-pill"
                                                            style={{
                                                                whiteSpace: "normal",
                                                                fontWeight: "500",
                                                                padding: "6px 12px",
                                                                textDecoration: "none",
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

                                        <div className="col-sm-3">
                                            <p className="d-flex align-items-center mb-3">
                                                <i className="ti ti-users me-2" />
                                                Assigned Students
                                            </p>
                                        </div>
                                        <div className="col-sm-9">
                                            {groupsLoading ? (
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <span>Loading students...</span>
                                                </div>
                                            ) : groups.length > 0 ? (
                                                <div className="mb-3">
                                                    {groups.map((group) => (
                                                        <div key={group._id} className="mb-2">
                                                            <h6 className="mb-2">Group: {group.nom_groupe}</h6>
                                                            {group.id_students && group.id_students.length > 0 ? (
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {group.id_students.map((student) => (
                                                                        <div 
                                                                            key={student._id} 
                                                                            className="badge bg-light-secondary text-dark d-flex align-items-center p-2"
                                                                            style={{ fontSize: '0.9rem' }}
                                                                        >
                                                                            <span className="avatar avatar-xs avatar-rounded bg-primary text-white me-2">
                                                                                {student.name.charAt(0).toUpperCase()}
                                                                            </span>
                                                                            {student.name} {student.lastname}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-muted">No students in this group</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted mb-3">No groups assigned to this project</p>
                                            )}
                                        </div>
                                        <div className="col-sm-12">
                                            <div className="mb-3">
                                                <h6 className="mb-1">Description</h6>
                                                <p>{project.description}</p>
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

                            <div className="custom-accordion-items">
                                <div className="accordion accordions-items-seperate" id="accordionExample">
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
                                                        tasks.map((task) => (
                                                            <div
                                                                key={task._id}
                                                                className="list-group-item border rounded mb-2 p-2"
                                                            >
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
                                                                                    checked={task.état === "Completed"}
                                                                                    onChange={(e) =>
                                                                                        handleTaskStatusChange(
                                                                                            task._id,
                                                                                            e.target.checked ? "Completed" : "To Do"
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            <span className="me-2 d-flex align-items-center rating-select">
                                                                                <i
                                                                                    className={`ti ti-star${
                                                                                        task.priority === "High"
                                                                                            ? "-filled filled"
                                                                                            : ""
                                                                                    }`}
                                                                                />
                                                                            </span>
                                                                            <div className="strike-info">
                                                                                <h4 
                                                                                    className="fs-14" 
                                                                                    style={{ cursor: 'pointer' }}
                                                                                    onClick={() => navigate(`/task-details/${task._id}`)}
                                                                                >
                                                                                    {task.name}
                                                                                </h4>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-5">
                                                                        <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                                                            <span
                                                                                className={`badge ${
                                                                                    task.état === "In Progress"
                                                                                        ? "bg-soft-purple"
                                                                                        : task.état === "Completed"
                                                                                            ? "bg-soft-success"
                                                                                            : task.état === "In Review"
                                                                                                ? "bg-soft-info"
                                                                                                : "bg-soft-pink"
                                                                                } d-inline-flex align-items-center me-3`}
                                                                            >
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
                                                                                                data-bs-toggle="modal"
                                                                                                data-inert={true}
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
                                                                                                data-bs-toggle="modal"
                                                                                                data-inert={true}
                                                                                                data-bs-target="#delete_modal"
                                                                                            >
                                                                                                <i className="ti ti-trash me-2" />
                                                                                                Delete
                                                                                            </Link>
                                                                                        </li>
                                                                                        <li>
                                                                                            <Link
                                                                                                to={`/task-details/${task._id}`}
                                                                                                className="dropdown-item rounded-1"
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
                                                        <div className="text-center py-3">
                                                            <p>No tasks found for this project.</p>
                                                        </div>
                                                    )}

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
                        Designed & Developed By{" "}
                        <Link to="#" className="text-primary">
                            Dreams
                        </Link>
                    </p>
                </div>
            </div>

            <div className="modal fade" id="edit_project" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header header-border align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <h5 className="modal-title me-2">Edit Project</h5>
                                <p className="text-dark">Project ID : {project?._id?.substring(0, 8) || ""}</p>
                            </div>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="add-info-fieldset">
                            <div className="contact-grids-tab p-3 pb-0">
                                <ul className="nav nav-underline" id="myTab1" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className={`nav-link ${editActiveTab === "basic-info" ? "active" : ""}`}
                                            id="basic-tab1"
                                            data-bs-toggle="tab"
                                            data-bs-target="#basic-info1"
                                            type="button"
                                            role="tab"
                                            aria-selected={editActiveTab === "basic-info"}
                                            onClick={() => setEditActiveTab("basic-info")}
                                        >
                                            Basic Information
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className={`nav-link ${editActiveTab === "keywords" ? "active" : ""}`}
                                            id="keywords-tab1"
                                            data-bs-toggle="tab"
                                            data-bs-target="#keywords1"
                                            type="button"
                                            role="tab"
                                            aria-selected={editActiveTab === "keywords"}
                                            onClick={() => setEditActiveTab("keywords")}
                                        >
                                            Keywords
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="tab-content" id="myTabContent1">
                                <div
                                    className={`tab-pane fade ${editActiveTab === "basic-info" ? "show active" : ""}`}
                                    id="basic-info1"
                                    role="tabpanel"
                                    aria-labelledby="basic-tab1"
                                    tabIndex={0}
                                >
                                    {editFormData ? (
                                        <form>
                                            <div className="modal-body">
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                                                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                                                {editAvatarPreview ? (
                                                                    <img
                                                                        src={editAvatarPreview}
                                                                        alt="Project Logo"
                                                                        className="img-fluid rounded-circle" // Already rounded-circle
                                                                        style={{
                                                                            width: "100%",
                                                                            height: "100%",
                                                                            objectFit: "cover",
                                                                        }}
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.onerror = null;
                                                                            target.src = "assets/img/social/project-01.svg";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <i className="ti ti-photo text-gray-2 fs-16" />
                                                                )}
                                                            </div>
                                                            <div className="profile-upload">
                                                                <div className="mb-2">
                                                                    <h6 className="mb-1">Upload Project Logo</h6>
                                                                    <p className="fs-12">Image should be below 4 mb</p>
                                                                </div>
                                                                <div className="profile-uploader d-flex align-items-center">
                                                                    <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                                                        Upload
                                                                        <input
                                                                            type="file"
                                                                            className="form-control image-sign"
                                                                            accept="image/*"
                                                                            onChange={handleEditAvatarChange}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-light btn-sm"
                                                                        onClick={clearEditAvatar}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <div className="mb-3">
                                                            <label className="form-label">Project Title *</label>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Enter project title"
                                                                name="title"
                                                                value={editFormData.title}
                                                                onChange={handleEditInputChange}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Difficulty</label>
                                                            <select
                                                                className="form-select"
                                                                name="difficulty"
                                                                value={editFormData.difficulty || "Medium"}
                                                                onChange={handleEditInputChange}
                                                            >
                                                                {difficultyOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Status</label>
                                                            <select
                                                                className="form-select"
                                                                name="status"
                                                                value={editFormData.status || "Not Started"}
                                                                onChange={handleEditInputChange}
                                                            >
                                                                {statusOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <div className="mb-3">
                                                            <label className="form-label">Speciality</label>
                                                            <select
                                                                className="form-select"
                                                                name="speciality"
                                                                value={editFormData.speciality || "Twin"}
                                                                onChange={handleEditInputChange}
                                                            >
                                                                {specialityOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <div className="mb-3">
                                                            <label className="form-label">Description *</label>
                                                            <textarea
                                                                className="form-control"
                                                                rows={4}
                                                                placeholder="Enter project description"
                                                                name="description"
                                                                value={editFormData.description}
                                                                onChange={handleEditInputChange}
                                                                required
                                                            ></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="modal-footer">
                                                <div className="d-flex align-items-center justify-content-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-light border me-2"
                                                        data-bs-dismiss="modal"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className="btn btn-primary"
                                                        type="button"
                                                        onClick={() => setEditActiveTab("keywords")}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="modal-body">
                                            <p>Loading project data...</p>
                                        </div>
                                    )}
                                </div>
                                <div
                                    className={`tab-pane fade ${editActiveTab === "keywords" ? "show active" : ""}`}
                                    id="keywords1"
                                    role="tabpanel"
                                    aria-labelledby="keywords-tab1"
                                    tabIndex={0}
                                >
                                    {editFormData ? (
                                        <form onSubmit={handleEditSubmit}>
                                            <div className="modal-body">
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <div className="mb-3">
                                                            <label className="form-label me-2">Keywords *</label>
                                                            <CommonTagsInput
                                                                value={editKeywords}
                                                                onChange={(keywords: string[]) => {
                                                                    const validKeywords = keywords.map((keyword) =>
                                                                        keyword.length > 500
                                                                            ? keyword.substring(0, 500)
                                                                            : keyword
                                                                    );
                                                                    setEditKeywords(validKeywords);
                                                                    setEditFormData((prev) =>
                                                                        prev
                                                                            ? {
                                                                                ...prev,
                                                                                keywords: validKeywords,
                                                                            }
                                                                            : prev
                                                                    );
                                                                }}
                                                                placeholder="Add keyword and press enter"
                                                                className="custom-input-class"
                                                            />
                                                            <small className="text-muted">Enter at least one keyword</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="modal-footer">
                                                <div className="d-flex align-items-center justify-content-between w-100">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary"
                                                        onClick={() => setEditActiveTab("basic-info")}
                                                    >
                                                        Back
                                                    </button>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-light border me-2"
                                                            data-bs-dismiss="modal"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            className="btn btn-primary"
                                                            type="submit"
                                                            disabled={editLoading}
                                                        >
                                                            {editLoading ? (
                                                                <>
                                                                    <span
                                                                        className="spinner-border spinner-border-sm me-2"
                                                                        role="status"
                                                                        aria-hidden="true"
                                                                    ></span>
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                "Update Project"
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="modal-body">
                                            <p>Loading project data...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectDetails;
