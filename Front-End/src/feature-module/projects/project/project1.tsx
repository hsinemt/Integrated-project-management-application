import React, {useEffect, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import { all_routes } from '../../router/all_routes'
import ImageWithBasePath from '../../../core/common/imageWithBasePath'
import CommonSelect from '../../../core/common/commonSelect'
import { DatePicker } from 'antd'
import { priority } from '../../../core/common/selectoption/selectoption'
import CommonTagsInput from '../../../core/common/Taginput'
import CommonTextEditor from '../../../core/common/textEditor'
import CollapseHeader from '../../../core/common/collapse-header/collapse-header'
import {
  initialProjectData,
  addProject,
  getAllProjects,
  deleteProject,
  ProjectType,
  ApiResponse,
  getProjectsCount,
  generateProjectFromPrompt,
  createProjectFromPrompt
} from '../../../api/projectsApi/project/projectApi'
import { getTaskCountsByProjectId, TaskCountsType } from "../../../api/projectsApi/task/taskApi"
import { getGroupsByProjectId, GroupType } from '../../../api/projectsApi/group/groupApi'

declare global {
  interface Window {
    bootstrap?: {
      Modal: {
        getInstance(element: Element): { show(): void; hide(): void } | null;
        new(element: Element): { show(): void; hide(): void };
      };
    };
  }
}

const Project = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProjectType>(initialProjectData);
  const [projectKeywords, setProjectKeywords] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [visibleProjects, setVisibleProjects] = useState<number>(8);
  const [projectCount, setProjectCount] = useState<number>(0);

  // State for task counts
  const [projectTaskCounts, setProjectTaskCounts] = useState<{[key: string]: TaskCountsType}>({});
  const [loadingTaskCounts, setLoadingTaskCounts] = useState<boolean>(false);

  // State for group members
  const [projectGroupMembers, setProjectGroupMembers] = useState<{[key: string]: number}>({});
  const [loadingGroupMembers, setLoadingGroupMembers] = useState<boolean>(false);

  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // State for AI generation
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedProject, setGeneratedProject] = useState<ProjectType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('basic-info');
  const [generationError, setGenerationError] = useState<string>('');

  const difficultyOptions = [
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' },
    { value: 'Very Hard', label: 'Very Hard' }
  ];

  const statusOptions = [
    { value: 'Not Started', label: 'Not Started' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];

  const specialityOptions = [
    { value: 'Twin', label: 'Twin' },
    { value: 'ERP/BI', label: 'ERP/BI' },
    { value: 'AI', label: 'AI' },
    { value: 'SAE', label: 'SAE' },
    { value: 'SE', label: 'SE' },
    { value: 'SIM', label: 'SIM' },
    { value: 'NIDS', label: 'NIDS' },
    { value: 'SLEAM', label: 'SLEAM' },
    { value: 'GAMIX', label: 'GAMIX' },
    { value: 'WIN', label: 'WIN' },
    { value: 'IoSyS', label: 'IoSyS' },
    { value: 'ArcTic', label: 'ArcTic' }
  ];

  const [deleteModalState, setDeleteModalState] = useState<'confirm' | 'success' | 'error'>('confirm');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string>('');

  const getProjectsPerRow = () => {
    return 3;
  };

  const fetchProjectCount = async () => {
    try {
      const count = await getProjectsCount();
      setProjectCount(count);
    } catch (error) {
      console.error('Error fetching project count:', error);
    }
  };

  // Function to fetch task counts for visible projects
  const fetchTaskCounts = async (projectIds: string[]) => {
    setLoadingTaskCounts(true);
    try {
      const counts: {[key: string]: TaskCountsType} = {};

      // Create an array of promises for all task count requests
      const promises = projectIds.map(async (projectId) => {
        try {
          const result = await getTaskCountsByProjectId(projectId);
          return { projectId, result };
        } catch (error) {
          console.error(`Error fetching task counts for project ${projectId}:`, error);
          return { projectId, result: { total: 0, completed: 0 } };
        }
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);

      // Process the results
      results.forEach(({ projectId, result }) => {
        counts[projectId] = result;
      });

      setProjectTaskCounts(prevCounts => ({
        ...prevCounts,
        ...counts
      }));
    } catch (error) {
      console.error('Error fetching task counts:', error);
    } finally {
      setLoadingTaskCounts(false);
    }
  };

  // Updated function to fetch group members without relying on backend populate
  const fetchGroupMembers = async (projectIds: string[]) => {
    setLoadingGroupMembers(true);
    try {
      const memberCounts: {[key: string]: number} = {};

      // Create an array of promises for all group member requests
      const promises = projectIds.map(async (projectId) => {
        try {
          // Get the groups without expecting populated data
          const groups = await getGroupsByProjectId(projectId);

          // Calculate total number of students across all groups for this project
          let totalStudents = 0;

          groups.forEach(group => {
            // Since we're getting unpopulated data, id_students will be just an array of IDs
            // We can still count its length
            if (group.id_students && Array.isArray(group.id_students)) {
              totalStudents += group.id_students.length;
            }
          });

          return { projectId, totalStudents };
        } catch (error) {
          console.error(`Error fetching group members for project ${projectId}:`, error);
          // Return 0 students on error so we still show something
          return { projectId, totalStudents: 0 };
        }
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);

      // Process the results
      results.forEach(({ projectId, totalStudents }) => {
        memberCounts[projectId] = totalStudents;
      });

      setProjectGroupMembers(prevCounts => ({
        ...prevCounts,
        ...memberCounts
      }));
    } catch (error) {
      console.error('Error fetching group members:', error);
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  useEffect(() => {
    const deleteModal = document.getElementById('delete_modal');
    if (deleteModal) {
      deleteModal.addEventListener('show.bs.modal', (event: Event) => {
        const target = (event as any).relatedTarget as HTMLElement;

        if (target) {
          const projectId = target.getAttribute('data-project-id');
          if (projectId) {
            setProjectToDelete(projectId);
          }
        }

        setDeleteModalState('confirm');
      });

      deleteModal.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
          setDeleteModalState('confirm');
          setDeleteErrorMessage('');
        }, 300);
      });
    }

    fetchProjects();
    fetchProjectCount();

    return () => {
      if (deleteModal) {
        deleteModal.removeEventListener('show.bs.modal', () => {});
        deleteModal.removeEventListener('hidden.bs.modal', () => {});
      }
    };
  }, []);

  // Effect to fetch task counts and group members when visible projects change
  useEffect(() => {
    if (projects.length > 0) {
      const visibleProjectIds = projects
          .slice(0, visibleProjects)
          .map(p => p._id)
          .filter(id => id) as string[];

      fetchTaskCounts(visibleProjectIds);
      fetchGroupMembers(visibleProjectIds);
    }
  }, [projects, visibleProjects]);

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };


  const fetchProjects = async () => {
    setLoading(true);
    try {
      const projectsList = await getAllProjects();
      setProjects(projectsList);
    } catch (error: unknown) {
      console.error('Error fetching projects:', error);
      alert(error instanceof Error ? error.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getCreatorName = (project: ProjectType) => {
    if (project.creator && project.creator.name && project.creator.lastname) {
      return `${project.creator.name} ${project.creator.lastname}`;
    }
    return "Unknown creator";
  }

  const handleLoadMore = () => {
    setVisibleProjects(prev => prev + getProjectsPerRow() * 2);
  };

  const findProjectTitle = (projectId: string | null) => {
    if (!projectId) return '';
    const project = projects.find(p => p._id === projectId);
    return project ? project.title : '';
  };

  const handleModalDelete = () => {
    if (projectToDelete) {
      handleDeleteConfirmWithId(projectToDelete);
    } else {
      console.error('No project selected for deletion');
    }
  };

  const handleDeleteConfirmWithId = async (projectId: string) => {
    if (!projectId) {
      console.error('No project ID provided to handleDeleteConfirmWithId');
      return;
    }

    setLoading(true);
    try {
      const response = await deleteProject(projectId);

      if (response && response.success) {
        fetchProjects();
        fetchProjectCount();
        setDeleteModalState('success');
      } else {
        setDeleteErrorMessage(response?.message || 'Failed to delete project');
        setDeleteModalState('error');
      }
    } catch (error: unknown) {
      console.error('Error deleting project:', error);
      if (error instanceof Error) {
        setDeleteErrorMessage(error.message);
      } else {
        setDeleteErrorMessage('An unknown error occurred while deleting the project');
      }
      setDeleteModalState('error');
    } finally {
      setLoading(false);
      setProjectToDelete(null);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };


  const getProjectInitials = (title: string): string => {
    if (!title) return '';


    const words = title.trim().split(/\s+/);

    if (words.length === 0) return '';

    if (words.length === 1) {

      return words[0].substring(0, 2).toUpperCase();
    } else {

      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
  };


  const getAvatarBgColor = (title: string): string => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    const bgColors = [
      'bg-primary',
      'bg-success',
      'bg-info',
      'bg-warning',
      'bg-danger',
      'bg-purple',
      'bg-secondary'
    ];

    const index = Math.abs(hash) % bgColors.length;
    return bgColors[index];
  };


  const getSpecialityBadgeClass = (speciality: string | undefined): string => {
    switch(speciality) {
      case 'Twin':
        return 'bg-light-primary text-primary';
      case 'ERP/BI':
        return 'bg-light-info text-info';
      case 'AI':
        return 'bg-light-purple text-purple';
      case 'SAE':
        return 'bg-light-success text-success';
      case 'SE':
        return 'bg-light-danger text-danger';
      case 'SIM':
        return 'bg-light-warning text-warning';
      case 'NIDS':
        return 'bg-light-secondary text-secondary';
      case 'SLEAM':
        return 'bg-light-info text-info';
      case 'GAMIX':
        return 'bg-light-purple text-purple';
      case 'WIN':
        return 'bg-light-success text-success';
      case 'IoSyS':
        return 'bg-light-warning text-warning';
      case 'ArcTic':
        return 'bg-light-danger text-danger';
      default:
        return 'bg-light-primary text-primary';
    }
  };


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLogo(file);


      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };


  const clearSelectedLogo = () => {
    setSelectedLogo(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }
  };

  // Function to handle generating project from prompt
  const handleGenerateProject = async () => {
    if (!prompt.trim()) {
      setGenerationError('Please enter a prompt');
      return;
    }

    setGenerationError('');
    setIsGenerating(true);
    try {
      const project = await generateProjectFromPrompt(prompt);
      setGeneratedProject(project);

      // Update form data with generated project details
      setFormData({
        ...formData,
        title: project.title,
        description: project.description,
      });

      // Update keywords
      if (project.keywords && Array.isArray(project.keywords)) {
        setProjectKeywords(project.keywords);
      }

      // Automatically switch to the generated project view
      setActiveTab('generated-project');
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate project. Please try again.');
      console.error('Error generating project:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to save generated project directly
  const handleSaveGeneratedProject = async () => {
    if (!generatedProject) return;

    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        keywords: projectKeywords,
      };

      const response = await addProject(submissionData, selectedLogo || undefined);

      if (response.success) {
        setFormData(initialProjectData);
        setProjectKeywords([]);
        setGeneratedProject(null);
        setPrompt('');
        clearSelectedLogo();

        const modal = document.getElementById('add_project');
        if (modal && window.bootstrap?.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        fetchProjects();
        fetchProjectCount();

        const successModal = document.getElementById('success_modal');
        if (successModal && window.bootstrap?.Modal) {
          const bsModal = new window.bootstrap.Modal(successModal);
          bsModal.show();
        }
      } else {
        alert(response.message || 'Failed to add project');
      }
    } catch (error: unknown) {
      console.error('Error adding project:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while adding the project');
    } finally {
      setLoading(false);
    }
  };

  // Function to directly create project from prompt (server-side generation)
  const handleDirectProjectCreation = async () => {
    if (!prompt.trim()) {
      setGenerationError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await createProjectFromPrompt(
          prompt,
          formData.speciality,
          formData.difficulty
      );

      if (response.success) {
        setPrompt('');
        setGeneratedProject(null);

        const modal = document.getElementById('add_project');
        if (modal && window.bootstrap?.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        fetchProjects();
        fetchProjectCount();

        const successModal = document.getElementById('success_modal');
        if (successModal && window.bootstrap?.Modal) {
          const bsModal = new window.bootstrap.Modal(successModal);
          bsModal.show();
        }
      } else {
        setGenerationError(response.message || 'Failed to create project from prompt');
      }
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to create project. Please try again.');
      console.error('Error creating project from prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to reset the AI generation process
  const handleResetGeneration = () => {
    setGeneratedProject(null);
    setPrompt('');
    setGenerationError('');
    setActiveTab('ai-generate');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title || !formData.description || formData.keywords.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You need to be logged in to create a project');
        setLoading(false);
        return;
      }


      const submissionData = {
        ...formData,
        keywords: projectKeywords
      };


      const response = await addProject(submissionData, selectedLogo || undefined);

      if (response.success) {
        setFormData(initialProjectData);
        setProjectKeywords([]);
        clearSelectedLogo();

        const modal = document.getElementById('add_project');
        if (modal && window.bootstrap?.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        fetchProjects();
        fetchProjectCount();

        const successModal = document.getElementById('success_modal');
        if (successModal && window.bootstrap?.Modal) {
          const bsModal = new window.bootstrap.Modal(successModal);
          bsModal.show();
        }
      } else {
        alert(response.message || 'Failed to add project');
      }
    } catch (error: unknown) {
      console.error('Error adding project:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while adding the project');
    } finally {
      setLoading(false);
    }
  };

  return (
      <>
        <>
          {/* Page Wrapper */}
          <div className="page-wrapper">
            <div className="content">
              {/* Breadcrumb */}
              <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                <div className="my-auto mb-2">
                  <h2 className="mb-1">Projects</h2>
                  <nav>
                    <ol className="breadcrumb mb-0">
                      <li className="breadcrumb-item">
                        <Link to={all_routes.adminDashboard}>
                          <i className="ti ti-smart-home" />
                        </Link>
                      </li>
                      <li className="breadcrumb-item">Management</li>
                      <li className="breadcrumb-item active" aria-current="page">
                        Projects Grid
                      </li>
                    </ol>
                  </nav>
                </div>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                  <div className="me-2 mb-2">
                    <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                      <Link to={all_routes.projectlist} className="btn btn-icon btn-sm me-1">
                        <i className="ti ti-list-tree" />
                      </Link>
                      <Link
                          to={all_routes.project}
                          className="btn btn-icon btn-sm active bg-primary text-white"
                      >
                        <i className="ti ti-layout-grid" />
                      </Link>
                    </div>
                  </div>
                  <div className="me-2 mb-2">
                    <div className="dropdown">
                      <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                          data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-file-export me-1" />
                        Export
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link
                              to="#"
                              className="dropdown-item rounded-1"
                          >
                            <i className="ti ti-file-type-pdf me-1" />
                            Export as PDF
                          </Link>
                        </li>
                        <li>
                          <Link
                              to="#"
                              className="dropdown-item rounded-1"
                          >
                            <i className="ti ti-file-type-xls me-1" />
                            Export as Excel{" "}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mb-2">
                    <Link
                        to="#"
                        data-bs-toggle="modal" data-inert={true}
                        data-bs-target="#add_project"
                        className="btn btn-primary d-flex align-items-center"
                    >
                      <i className="ti ti-circle-plus me-2" />
                      Add Project
                    </Link>
                  </div>
                  {/*<div className="me-2 mb-2">*/}
                  {/*  <Link*/}
                  {/*      to="/add-group"*/}
                  {/*      className="btn btn-white d-inline-flex align-items-center"*/}
                  {/*  >*/}
                  {/*    <i className="ti ti-plus me-1" />*/}
                  {/*    Add Group*/}
                  {/*  </Link>*/}
                  {/*</div>*/}
                  <div className="ms-2 head-icons">
                    <CollapseHeader />
                  </div>
                </div>
              </div>
              {/* /Breadcrumb */}
              <div className="card">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                    <h5>Projects Grid</h5>
                    <div className="d-flex align-items-center flex-wrap row-gap-3">
                      <div className="dropdown me-2">
                        <Link
                            to="#"
                            className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                            data-bs-toggle="dropdown"
                        >
                          Select Status
                        </Link>
                        <ul className="dropdown-menu  dropdown-menu-end p-3">
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Select Status
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Active
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Inactive
                            </Link>
                          </li>
                        </ul>
                      </div>
                      <div className="dropdown">
                        <Link
                            to="#"
                            className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                            data-bs-toggle="dropdown"
                        >
                          Sort By : Last 7 Days
                        </Link>
                        <ul className="dropdown-menu  dropdown-menu-end p-3">
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Recently Added
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Ascending
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Desending
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Last Month
                            </Link>
                          </li>
                          <li>
                            <Link
                                to="#"
                                className="dropdown-item rounded-1"
                            >
                              Last 7 Days
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Project Grid */}
              <div className="row">
                {loading ? (
                    <div className="col-12 text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="col-12 text-center py-5">
                      <div className="alert alert-info">
                        <i className="ti ti-info-circle me-2"></i>
                        No projects found. Create your first project by clicking the "Add Project" button.
                      </div>
                    </div>
                ) : (
                    projects.slice(0, visibleProjects).map((project) => (
                        <div className="col-xxl-3 col-lg-4 col-md-6" key={project._id}>
                          <div className="card">
                            <div className="card-body">
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="d-flex align-items-center">
                                  <div className="avatar avatar-md avatar-rounded me-2">
                                    {project.projectLogo ? (
                                        <img
                                            src={project.projectLogo}
                                            alt={project.title}
                                            className="img-fluid"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.onerror = null;
                                              target.src = `/assets/img/specialities/${project.speciality || 'default'}.png`;
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={`/assets/img/specialities/${project.speciality || 'default'}.png`}
                                            alt={project.title}
                                            className="img-fluid"
                                        />
                                    )}
                                  </div>
                                  <h6 className="mb-0">
                                    <Link to={`/project-details/${project._id}`}>{project.title}</Link>
                                  </h6>
                                </div>
                                <div className="dropdown">
                                  <Link
                                      to="#"
                                      className="d-inline-flex align-items-center"
                                      data-bs-toggle="dropdown"
                                      aria-expanded="false"
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
                                          data-bs-target="#edit_project"
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
                                          data-project-id={project._id}
                                      >
                                        <i className="ti ti-trash me-1" />
                                        Delete
                                      </Link>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className={`badge ${getSpecialityBadgeClass(project.speciality)} me-1`}>
                                  {project.speciality}
                                </span>
                              </div>
                              <div className="mb-3 pb-3 border-bottom">
                                <p className="text-truncate line-clamb-3 mb-0">
                                  {project.description}
                                </p>
                              </div>
                              <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <div className="d-flex align-items-center file-name-icon">
                                  <Link
                                      to="#"
                                      className="avatar avatar-sm avatar-rounded flex-shrink-0"
                                  >
                                    <ImageWithBasePath
                                        src="assets/img/users/user-39.jpg"
                                        className="img-fluid"
                                        alt="img"
                                    />
                                  </Link>
                                  <div className="ms-2">
                                    <h6 className="fw-normal fs-12">
                                      <Link to="#">{getCreatorName(project)}</Link>
                                    </h6>
                                    <span className="fs-12 fw-normal ">{project.creator?.role}</span>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center">
                                  <div>
                                    <span className="fs-12 fw-normal ">Deadline</span>
                                    <p className="mb-0 fs-12">14 Jan 2024</p>
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span className="avatar avatar-sm avatar-rounded bg-success-transparent flex-shrink-0 me-2">
                                    <i className="ti ti-checklist text-success fs-16" />
                                  </span>
                                  <p>
                                    <small>Tasks : </small>
                                    {project._id && projectTaskCounts[project._id] ? (
                                        <>
                                        <span className="text-dark">
                                          {projectTaskCounts[project._id].completed}
                                        </span>
                                          /{projectTaskCounts[project._id].total}
                                        </>
                                    ) : loadingTaskCounts ? (
                                        <span className="text-muted">Loading...</span>
                                    ) : (
                                        <span className="text-muted">0/0</span>
                                    )}
                                  </p>
                                </div>

                                {/* Group members display */}
                                <div className="avatar-list-stacked avatar-group-sm">
                                  {project._id && projectGroupMembers[project._id] > 0 ? (
                                      // If there are group members, show individual circles for each member
                                      <>
                                        {Array.from({ length: Math.min(projectGroupMembers[project._id], 4) }).map((_, index) => (
                                            <span
                                                key={`${project._id}-member-${index}`}
                                                className="avatar avatar-rounded"
                                                title="Group member"
                                            >
          <ImageWithBasePath
              className="border border-white"
              src={`assets/img/profiles/avatar-0${index + 2}.jpg`}
              alt="Group member"
          />
        </span>
                                        ))}
                                        {/* Show a "+X" circle if there are more than 4 members */}
                                        {projectGroupMembers[project._id] > 4 && (
                                            <Link
                                                className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium"
                                                to={`/project-details/${project._id}`}
                                                title={`${projectGroupMembers[project._id] - 4} more members`}
                                            >
                                              +{projectGroupMembers[project._id] - 4}
                                            </Link>
                                        )}
                                      </>
                                  ) : loadingGroupMembers ? (
                                      // Show loading indicator
                                      <span className="avatar bg-light avatar-rounded fs-12 fw-medium">
      <i className="ti ti-loader animate-spin"></i>
    </span>
                                  ) : (
                                      // Show "0" if no members
                                      <span className="avatar bg-light-secondary text-secondary avatar-rounded fs-12 fw-medium">
      0
    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))
                )}

                {!loading && projects.length > 0 && visibleProjects < projects.length && (
                    <div className="col-md-12">
                      <div className="text-center mb-4">
                        <button
                            className="btn btn-primary"
                            onClick={handleLoadMore}
                        >
                          <i className="ti ti-loader-3 me-1" />
                          Load More
                        </button>
                      </div>
                    </div>
                )}
              </div>
              {/* / Project Grid */}

              {/* Delete Modal*/}
              <div className="modal fade" id="delete_modal" data-bs-backdrop="static">
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-body text-center">
                      {deleteModalState === 'confirm' && (
                          <>
                          <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                            <i className="ti ti-trash-x fs-36" />
                          </span>
                            <h4 className="mb-1">Confirm Delete</h4>
                            <p className="mb-3">
                              You want to delete this project, this can't be undone once
                              you delete.
                            </p>
                            <div className="d-flex justify-content-center">
                              <Link
                                  to="#"
                                  className="btn btn-light me-3"
                                  data-bs-dismiss="modal"
                              >
                                Cancel
                              </Link>
                              <button
                                  className="btn btn-danger"
                                  onClick={() => handleModalDelete()}
                                  disabled={loading}
                              >
                                {loading ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                      Deleting...
                                    </>
                                ) : 'Yes, Delete'}
                              </button>
                            </div>
                          </>
                      )}

                      {deleteModalState === 'success' && (
                          <>
                          <span className="avatar avatar-xl bg-transparent-success text-success mb-3">
                            <i className="ti ti-check fs-36" />
                          </span>
                            <h4 className="mb-1">Project Deleted Successfully</h4>
                            <p className="mb-3">
                              The project has been removed from the system.
                            </p>
                            <div className="d-flex justify-content-center">
                              <button
                                  className="btn btn-dark"
                                  data-bs-dismiss="modal"
                              >
                                OK
                              </button>
                            </div>
                          </>
                      )}

                      {deleteModalState === 'error' && (
                          <>
                          <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                            <i className="ti ti-alert-circle fs-36" />
                          </span>
                            <h4 className="mb-1">Error Deleting Project</h4>
                            <p className="mb-3">
                              {deleteErrorMessage}
                            </p>
                            <div className="d-flex justify-content-center">
                              <button
                                  className="btn btn-dark"
                                  data-bs-dismiss="modal"
                              >
                                OK
                              </button>
                            </div>
                          </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* /Delete Modal */}

              {/* Success Modal */}
              <div className="modal fade" id="success_modal" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content">
                    <div className="modal-body">
                      <div className="text-center p-3">
                        <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                          <i className="ti ti-check fs-24" />
                        </span>
                        <h5 className="mb-2">Project Added Successfully</h5>
                        <p className="mb-3">
                          Project has been added with ID:{" "}
                          <span className="text-primary">#pro-0004</span>
                        </p>
                        <div>
                          <div className="row g-2">
                            <div className="col-6">
                              <Link to="#" className="btn btn-dark w-100" onClick={() => {
                                const modal = document.getElementById('success_modal');
                                if (modal && window.bootstrap?.Modal) {
                                  const modalInstance = window.bootstrap.Modal.getInstance(modal);
                                  if (modalInstance) {
                                    modalInstance.hide();
                                  }
                                }
                              }}>
                                Back to List
                              </Link>
                            </div>
                            <div className="col-6">
                              <Link
                                  to="#"
                                  className="btn btn-primary w-100"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* /Success Modal */}
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

        {/* Add Project Modal */}
        <div className="modal fade" id="add_project" role="dialog">
          {/* Add Project Modal content here - omitted for brevity */}
        </div>
      </>
  )
}

export default Project