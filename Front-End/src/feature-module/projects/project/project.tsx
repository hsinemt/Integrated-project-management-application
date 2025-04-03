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

import {  initialProjectData,project,getAllProjects,deleteProject,ProjectType,ApiResponse,getProjectsCount} from '../../../api/projectsApi/addProject/project'


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
  const [projectFeatures, setProjectFeatures] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [visibleProjects, setVisibleProjects] = useState<number>(8);
  const [projectCount, setProjectCount] = useState<number>(0);

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
      });
    }

    fetchProjects();
    fetchProjectCount();

    return () => {
      if (deleteModal) {
        deleteModal.removeEventListener('show.bs.modal', () => {});
      }
    };
  }, []);

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

      const deleteModal = document.getElementById('delete_modal');
      if (deleteModal && window.bootstrap?.Modal) {
        const modalInstance = window.bootstrap.Modal.getInstance(deleteModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }


      if (response && response.success) {
        fetchProjects();
        fetchProjectCount();
        setTimeout(() => {
          alert('Project deleted successfully');
        }, 300);
      } else {
        setTimeout(() => {
          alert(response?.message || 'Failed to delete project');
        }, 300);
      }
    } catch (error: unknown) {
      console.error('Error deleting project:', error);
      setTimeout(() => {
        if (error instanceof Error) {
          alert(`Error: ${error.message}`);
        } else {
          alert('An unknown error occurred while deleting the project');
        }
      }, 300);
    } finally {
      setLoading(false);
      setProjectToDelete(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title || !formData.description || formData.keyFeatures.length === 0) {
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

      const response = await project(formData);

      if (response.success) {
        setFormData(initialProjectData);
        setProjectFeatures([]);

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
                    // Only display the number of projects specified by visibleProjects state
                    projects.slice(0, visibleProjects).map((project) => (
                        <div className="col-xxl-3 col-lg-4 col-md-6" key={project._id}>
                          <div className="card">
                            <div className="card-body">
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6>
                                  <Link to={`/project-details/${project._id}`}>{project.title}</Link>
                                </h6>
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
                                    <span className="text-dark">6</span>/10
                                  </p>
                                </div>
                                <div className="avatar-list-stacked avatar-group-sm">
                <span className="avatar avatar-rounded">
                  <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-02.jpg"
                      alt="img"
                  />
                </span>
                                  <span className="avatar avatar-rounded">
                  <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-03.jpg"
                      alt="img"
                  />
                </span>
                                  <span className="avatar avatar-rounded">
                  <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-05.jpg"
                      alt="img"
                  />
                </span>
                                  <Link
                                      className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium"
                                      to="#"
                                  >
                                    +1
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))
                )}

                {/* Show "Load More" button only if there are more projects to load */}
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

              {/* Delete Modal */}
              <div className="modal fade" id="delete_modal">
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-body text-center">
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
                    </div>
                  </div>
                </div>
              </div>
              {/* /Delete Modal */}
              {/* Delete Success Modal */}
              <div className="modal fade" id="delete_success_modal" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content">
                    <div className="modal-body">
                      <div className="text-center p-3">
          <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
            <i className="ti ti-check fs-24" />
          </span>
                        <h5 className="mb-2">Project Deleted Successfully</h5>
                        <p className="mb-3">The project has been removed from the system.</p>
                        <div className="row g-2">
                          <div className="col-12">
                            <button className="btn btn-dark w-100" data-bs-dismiss="modal">
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Error Modal */}
              <div className="modal fade" id="delete_error_modal" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content">
                    <div className="modal-body">
                      <div className="text-center p-3">
          <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
            <i className="ti ti-alert-circle fs-24" />
          </span>
                        <h5 className="mb-2">Error Deleting Project</h5>
                        {/*
            If you want to show a dynamic message from the API,
            you can store it in a state and display it here
          */}
                        <p className="mb-3">Something went wrong while deleting this project.</p>
                        <div className="row g-2">
                          <div className="col-12">
                            <button className="btn btn-dark w-100" data-bs-dismiss="modal">
                              OK
                            </button>
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
                          className="nav-link active"
                          id="basic-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#basic-info"
                          type="button"
                          role="tab"
                          aria-selected="true"
                      >
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                          className="nav-link"
                          id="features-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#features"
                          type="button"
                          role="tab"
                          aria-selected="false"
                      >
                        Key Features
                      </button>
                    </li>
                  </ul>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="tab-content" id="myTabContent">
                    <div
                        className="tab-pane fade show active"
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
                                        multiple
                                    />
                                  </div>
                                  <button
                                      type="button"
                                      className="btn btn-light btn-sm"
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
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    description: e.target.value
                                  })}
                                  required
                              ></textarea>
                            </div>
                          </div>
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
                        className="tab-pane fade"
                        id="features"
                        role="tabpanel"
                        aria-labelledby="features-tab"
                        tabIndex={0}
                    >
                      <div className="modal-body">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label me-2">Key Features *</label>
                              <CommonTagsInput
                                  value={projectFeatures}
                                  onChange={(features: string[]) => {
                                    setProjectFeatures(features);
                                    setFormData({
                                      ...formData,
                                      keyFeatures: features
                                    });
                                  }}
                                  placeholder="Add feature and press enter"
                                  className="custom-input-class"
                              />
                              <small className="text-muted">Enter at least one key feature</small>
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
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        {/* /Add Project */}

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