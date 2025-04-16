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
  generateProjectFromPrompt, // Import the new function
  createProjectFromPrompt, updateProject // Import direct project creation function
} from '../../../api/projectsApi/project/projectApi'

// New imports for task counts and group members
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
  const [projectToEdit, setProjectToEdit] = useState<ProjectType | null>(null);
  const [editFormData, setEditFormData] = useState<ProjectType>(initialProjectData);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editActiveTab, setEditActiveTab] = useState<string>('basic-info');
  const [editSelectedLogo, setEditSelectedLogo] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // New state for task counts and group members
  const [projectTaskCounts, setProjectTaskCounts] = useState<{[key: string]: TaskCountsType}>({});
  const [loadingTaskCounts, setLoadingTaskCounts] = useState<boolean>(false);
  const [projectGroupMembers, setProjectGroupMembers] = useState<{[key: string]: number}>({});
  const [loadingGroupMembers, setLoadingGroupMembers] = useState<boolean>(false);

  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // New state for AI generation
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

  // Function to fetch group members
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

    // Add event listener for edit modal
    const editModal = document.getElementById('edit_project');
    if (editModal) {
      editModal.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
          setProjectToEdit(null);
          setEditFormData(initialProjectData);
          setEditKeywords([]);
          setEditLogoPreview(null);
          setEditSelectedLogo(null);
          setEditActiveTab('basic-info');
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

      if (editModal) {
        editModal.removeEventListener('hidden.bs.modal', () => {});
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

      if (projectsList.length > 0) {
      }

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

  const handleEditClick = (project: ProjectType) => {
    setProjectToEdit(project);
    setEditFormData({
      ...project
    });
    setEditKeywords(project.keywords || []);
    setEditActiveTab('basic-info');

    if (project.projectLogo) {
      setEditLogoPreview(project.projectLogo);
    } else {
      setEditLogoPreview(null);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditSelectedLogo(file);

      const previewUrl = URL.createObjectURL(file);
      setEditLogoPreview(previewUrl);
    }
  };

  const clearEditLogo = () => {
    setEditSelectedLogo(null);
    if (editLogoPreview && !projectToEdit?.projectLogo) {
      URL.revokeObjectURL(editLogoPreview);
      setEditLogoPreview(null);
    } else if (projectToEdit?.projectLogo) {
      setEditLogoPreview(projectToEdit.projectLogo);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!projectToEdit?._id) {
      alert('No project selected for editing');
      return;
    }

    if (!editFormData.title || !editFormData.description || editKeywords.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        ...editFormData,
        keywords: editKeywords
      };

      const response = await updateProject(projectToEdit._id, submissionData, editSelectedLogo || undefined);

      if (response.success) {
        // Reset form and state
        setProjectToEdit(null);
        setEditFormData(initialProjectData);
        setEditKeywords([]);
        setEditLogoPreview(null);
        setEditSelectedLogo(null);

        // Close modal
        const modal = document.getElementById('edit_project');
        if (modal && window.bootstrap?.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }

        // Refresh projects list
        fetchProjects();

        // Show success modal
        const successModal = document.getElementById('success_modal');
        if (successModal && window.bootstrap?.Modal) {
          const bsModal = new window.bootstrap.Modal(successModal);
          bsModal.show();
        }
      } else {
        alert(response.message || 'Failed to update project');
      }
    } catch (error: unknown) {
      console.error('Error updating project:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while updating the project');
    } finally {
      setLoading(false);
    }
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
                                          onClick={() => handleEditClick(project)}
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
                                {/*<span className="badge bg-light-secondary text-secondary">*/}
                                {/*  {project.difficulty}*/}
                                {/*</span>*/}
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
        {/* Add Project */}
        <div className="modal fade" id="add_project" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header header-border align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <h5 className="modal-title me-2">Add Project </h5>
                  <p className="text-dark">Project N° : PRO-{String(projectCount + 1).padStart(4, '0')}</p>
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
                  <ul className="nav nav-underline" id="myTab" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button
                          className={`nav-link ${activeTab === 'basic-info' ? 'active' : ''}`}
                          id="basic-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#basic-info"
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'basic-info'}
                          onClick={() => setActiveTab('basic-info')}
                      >
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                          className={`nav-link ${activeTab === 'features' ? 'active' : ''}`}
                          id="features-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#features"
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'features'}
                          onClick={() => setActiveTab('features')}
                      >
                        Keywords
                      </button>
                    </li>
                    {/* New AI Generation Tab */}
                    <li className="nav-item" role="presentation">
                      <button
                          className={`nav-link ${activeTab === 'ai-generate' ? 'active' : ''}`}
                          id="ai-generate-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#ai-generate"
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'ai-generate'}
                          onClick={() => setActiveTab('ai-generate')}
                      >
                        Generate with AI
                      </button>
                    </li>
                    {/* Tab for Generated Project Preview */}
                    {generatedProject && (
                        <li className="nav-item" role="presentation">
                          <button
                              className={`nav-link ${activeTab === 'generated-project' ? 'active' : ''}`}
                              id="generated-project-tab"
                              data-bs-toggle="tab"
                              data-bs-target="#generated-project"
                              type="button"
                              role="tab"
                              aria-selected={activeTab === 'generated-project'}
                              onClick={() => setActiveTab('generated-project')}
                          >
                            Generated Project
                          </button>
                        </li>
                    )}
                  </ul>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="tab-content" id="myTabContent">
                    <div
                        className={`tab-pane fade ${activeTab === 'basic-info' ? 'show active' : ''}`}
                        id="basic-info"
                        role="tabpanel"
                        aria-labelledby="basic-tab"
                        tabIndex={0}
                    >
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                              <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                <i className="ti ti-photo text-gray-2 fs-16" />
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
                                        onChange={handleLogoChange}
                                    />
                                  </div>
                                  <button
                                      type="button"
                                      className="btn btn-light btn-sm"
                                      onClick={clearSelectedLogo}
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {logoPreview && (
                                    <div className="mt-3">
                                      <p className="mb-1">Preview:</p>
                                      <img
                                          src={logoPreview}
                                          alt="Logo Preview"
                                          className="img-thumbnail"
                                          style={{ maxWidth: '100px', maxHeight: '100px' }}
                                      />
                                    </div>
                                )}
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
                                  maxLength={100}
                                  name="title"
                                  value={formData.title}
                                  onChange={handleInputChange}
                                  required
                              />
                              <small className="text-muted">Maximum 100 characters</small>
                            </div>
                          </div>
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-6">
                                <div className="mb-3">
                                  <label className="form-label">Start Date</label>
                                  <div className="input-icon-end position-relative">
                                    <DatePicker
                                        className="form-control datetimepicker"
                                        format={{
                                          format: "DD-MM-YYYY",
                                          type: "mask",
                                        }}
                                        getPopupContainer={getModalContainer}
                                        placeholder="DD-MM-YYYY"
                                    />
                                    <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-6">
                                <div className="mb-3">
                                  <label className="form-label">End Date</label>
                                  <div className="input-icon-end position-relative">
                                    <DatePicker
                                        className="form-control datetimepicker"
                                        format={{
                                          format: "DD-MM-YYYY",
                                          type: "mask",
                                        }}
                                        getPopupContainer={getModalContainer}
                                        placeholder="DD-MM-YYYY"
                                    />
                                    <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                                  </div>
                                </div>
                              </div>
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
                                  value={formData.description}
                                  onChange={handleInputChange}
                                  required
                              ></textarea>
                            </div>
                          </div>

                          {/* New fields added here */}
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Difficulty</label>
                              <select
                                  className="form-select"
                                  name="difficulty"
                                  value={formData.difficulty || 'Medium'}
                                  onChange={handleInputChange}
                              >
                                {difficultyOptions.map(option => (
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
                                  value={formData.status || 'Not Started'}
                                  onChange={handleInputChange}
                              >
                                {statusOptions.map(option => (
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
                                  value={formData.speciality || 'Twin'}
                                  onChange={handleInputChange}
                              >
                                {specialityOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* End of new fields */}

                          <div className="col-md-12">
                            <div className="input-block mb-0">
                              <label className="form-label">Upload Files</label>
                              <input className="form-control" type="file" />
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
                              onClick={() => {
                                document.getElementById('features-tab')?.click();
                              }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                        className={`tab-pane fade ${activeTab === 'features' ? 'show active' : ''}`}
                        id="features"
                        role="tabpanel"
                        aria-labelledby="features-tab"
                        tabIndex={0}
                    >
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label me-2">Keywords *</label>
                              <CommonTagsInput
                                  value={projectKeywords}
                                  onChange={(keywords: string[]) => {
                                    const validKeywords = keywords.map(keyword => keyword.length > 500 ? keyword.substring(0, 500) : keyword)
                                    setProjectKeywords(keywords);
                                    setFormData({
                                      ...formData,
                                      keywords: validKeywords
                                    });
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
                              onClick={() => {
                                document.getElementById('basic-tab')?.click();
                              }}
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
                                disabled={loading}
                            >
                              {loading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                  </>
                              ) : (
                                  'Save Project'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Generate Tab */}
                    <div
                        className={`tab-pane fade ${activeTab === 'ai-generate' ? 'show active' : ''}`}
                        id="ai-generate"
                        role="tabpanel"
                        aria-labelledby="ai-generate-tab"
                        tabIndex={0}
                    >
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12 mb-4">
                            <div className="alert alert-info">
                              <i className="ti ti-bulb me-2"></i>
                              Describe your project idea and our AI will generate the project details for you.
                            </div>
                          </div>

                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">Project Prompt *</label>
                              <textarea
                                  className="form-control"
                                  rows={5}
                                  placeholder="Describe your project idea (e.g., 'A mobile app for tracking water consumption with reminders and statistics')"
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  required
                              ></textarea>
                              <small className="text-muted">Be as specific as possible for better results</small>
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Difficulty</label>
                              <select
                                  className="form-select"
                                  name="difficulty"
                                  value={formData.difficulty || 'Medium'}
                                  onChange={handleInputChange}
                              >
                                {difficultyOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Speciality</label>
                              <select
                                  className="form-select"
                                  name="speciality"
                                  value={formData.speciality || 'Twin'}
                                  onChange={handleInputChange}
                              >
                                {specialityOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {generationError && (
                              <div className="col-md-12">
                                <div className="alert alert-danger">
                                  <i className="ti ti-alert-circle me-2"></i>
                                  {generationError}
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                      <div className="modal-footer">
                        <div className="d-flex align-items-center justify-content-between w-100">
                          <div>
                            <button
                                type="button"
                                className="btn btn-outline-primary me-2"
                                onClick={() => {
                                  document.getElementById('basic-tab')?.click();
                                }}
                            >
                              Back to Manual Entry
                            </button>
                          </div>
                          <div>
                            <button
                                type="button"
                                className="btn btn-outline-light border me-2"
                                data-bs-dismiss="modal"
                            >
                              Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-success me-2"
                                onClick={handleDirectProjectCreation}
                                disabled={isGenerating || !prompt.trim()}
                            >
                              {isGenerating ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Creating...
                                  </>
                              ) : (
                                  <>
                                    <i className="ti ti-wand me-1"></i>
                                    Generate & Save Directly
                                  </>
                              )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerateProject}
                                disabled={isGenerating || !prompt.trim()}
                            >
                              {isGenerating ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Generating...
                                  </>
                              ) : (
                                  <>
                                    <i className="ti ti-pencil me-1"></i>
                                    Generate & Edit
                                  </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Generated Project Preview Tab */}
                    {generatedProject && (
                        <div
                            className={`tab-pane fade ${activeTab === 'generated-project' ? 'show active' : ''}`}
                            id="generated-project"
                            role="tabpanel"
                            aria-labelledby="generated-project-tab"
                            tabIndex={0}
                        >
                          <div className="modal-body">
                            <div className="row">
                              <div className="col-md-12 mb-4">
                                <div className="alert alert-success">
                                  <i className="ti ti-check-circle me-2"></i>
                                  Project details have been generated successfully! Review before saving.
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="mb-3">
                                  <label className="form-label fw-bold">Project Title</label>
                                  <input
                                      type="text"
                                      className="form-control"
                                      value={formData.title}
                                      onChange={handleInputChange}
                                      name="title"
                                  />
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="mb-3">
                                  <label className="form-label fw-bold">Project Description</label>
                                  <textarea
                                      className="form-control"
                                      rows={5}
                                      value={formData.description}
                                      onChange={handleInputChange}
                                      name="description"
                                  ></textarea>
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="mb-3">
                                  <label className="form-label fw-bold">Keywords</label>
                                  <CommonTagsInput
                                      value={projectKeywords}
                                      onChange={(keywords: string[]) => {
                                        setProjectKeywords(keywords);
                                        setFormData({
                                          ...formData,
                                          keywords: keywords
                                        });
                                      }}
                                      className="custom-input-class"
                                  />
                                </div>
                              </div>

                              {/* Key Features section removed as requested */}

                              <div className="col-md-6">
                                <div className="mb-3">
                                  <label className="form-label">Difficulty</label>
                                  <select
                                      className="form-select"
                                      name="difficulty"
                                      value={formData.difficulty || 'Medium'}
                                      onChange={handleInputChange}
                                  >
                                    {difficultyOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="col-md-6">
                                <div className="mb-3">
                                  <label className="form-label">Speciality</label>
                                  <select
                                      className="form-select"
                                      name="speciality"
                                      value={formData.speciality || 'Twin'}
                                      onChange={handleInputChange}
                                  >
                                    {specialityOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="modal-footer">
                            <div className="d-flex align-items-center justify-content-between w-100">
                              <div>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={handleResetGeneration}
                                >
                                  <i className="ti ti-refresh me-1"></i> Generate Another
                                </button>
                              </div>
                              <div>
                                <button
                                    type="button"
                                    className="btn btn-outline-light border me-2"
                                    data-bs-dismiss="modal"
                                >
                                  Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveGeneratedProject}
                                    disabled={loading}
                                >
                                  {loading ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Saving...
                                      </>
                                  ) : (
                                      <>
                                        <i className="ti ti-device-floppy me-1"></i> Save Project
                                      </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        {/* /Add Project */}

        {/* Edit Project */}
        <div className="modal fade" id="edit_project" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header header-border align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <h5 className="modal-title me-2">Edit Project </h5>
                  <p className="text-dark">Project ID : {projectToEdit?._id ? projectToEdit._id.substring(0, 8) : ''}</p>
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
                          className={`nav-link ${editActiveTab === 'basic-info' ? 'active' : ''}`}
                          id="basic-tab1"
                          data-bs-toggle="tab"
                          data-bs-target="#basic-info1"
                          type="button"
                          role="tab"
                          aria-selected={editActiveTab === 'basic-info'}
                          onClick={() => setEditActiveTab('basic-info')}
                      >
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                          className={`nav-link ${editActiveTab === 'keywords' ? 'active' : ''}`}
                          id="keywords-tab1"
                          data-bs-toggle="tab"
                          data-bs-target="#keywords1"
                          type="button"
                          role="tab"
                          aria-selected={editActiveTab === 'keywords'}
                          onClick={() => setEditActiveTab('keywords')}
                      >
                        Keywords
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="tab-content" id="myTabContent1">
                  <div
                      className={`tab-pane fade ${editActiveTab === 'basic-info' ? 'show active' : ''}`}
                      id="basic-info1"
                      role="tabpanel"
                      aria-labelledby="basic-tab1"
                      tabIndex={0}
                  >
                    <form>
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                              <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                {editLogoPreview ? (
                                    <img
                                        src={editLogoPreview}
                                        alt="Project Logo"
                                        className="img-fluid rounded-circle"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                                        onChange={handleEditLogoChange}
                                    />
                                  </div>
                                  <button
                                      type="button"
                                      className="btn btn-light btn-sm"
                                      onClick={clearEditLogo}
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
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-6">
                                <div className="mb-3">
                                  <label className="form-label">Difficulty</label>
                                  <select
                                      className="form-select"
                                      name="difficulty"
                                      value={editFormData.difficulty || 'Medium'}
                                      onChange={handleEditInputChange}
                                  >
                                    {difficultyOptions.map(option => (
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
                                      value={editFormData.status || 'Not Started'}
                                      onChange={handleEditInputChange}
                                  >
                                    {statusOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">Speciality</label>
                              <select
                                  className="form-select"
                                  name="speciality"
                                  value={editFormData.speciality || 'Twin'}
                                  onChange={handleEditInputChange}
                              >
                                {specialityOptions.map(option => (
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
                              onClick={() => setEditActiveTab('keywords')}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div
                      className={`tab-pane fade ${editActiveTab === 'keywords' ? 'show active' : ''}`}
                      id="keywords1"
                      role="tabpanel"
                      aria-labelledby="keywords-tab1"
                      tabIndex={0}
                  >
                    <form onSubmit={handleEditSubmit}>
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label me-2">Keywords *</label>
                              <CommonTagsInput
                                  value={editKeywords}
                                  onChange={(keywords: string[]) => {
                                    const validKeywords = keywords.map(keyword =>
                                        keyword.length > 500 ? keyword.substring(0, 500) : keyword
                                    )
                                    setEditKeywords(keywords);
                                    setEditFormData({
                                      ...editFormData,
                                      keywords: validKeywords
                                    });
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
                              onClick={() => setEditActiveTab('basic-info')}
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
                                disabled={loading}
                            >
                              {loading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                  </>
                              ) : (
                                  'Update Project'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Edit Project */}

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

      </>
  )
}

export default Project