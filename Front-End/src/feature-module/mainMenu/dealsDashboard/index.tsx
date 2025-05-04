import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Chart } from "primereact/chart";

interface User {
  _id: string;
  name: string;
  lastname: string;
  email?: string;
}

interface Group {
  _id: string;
  name: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  projectName: string | null;
  projectId: string | null;
  studentCount: number;
  id_students: string[];
}

interface DashboardData {
  tutorId: string;
  groups: Group[];
}

interface BulkUsersResponse {
  users: User[];
}

const DealsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<Record<string, User>>({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9777";

  // Handle sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarOpen(e.detail.open);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle as EventListener);
    };
  }, []);

  // Calculate dynamic padding based on sidebar state
  const getContentStyle = () => {
    return {
      paddingLeft: sidebarOpen ? '280px' : '100px',
      transition: 'padding 0.3s ease',
      width: '100%'
    };
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get<DashboardData>(`${API_URL}/tutor/groups-progress`, {
          headers: {
            Authorization: `${localStorage.getItem('token')}`
          }
        });

        setDashboardData(response.data);

        // Prepare chart data
        if (response.data.groups?.length > 0) {
          setChartData({
            labels: response.data.groups.map(group => 
              `${group.name}${group.projectName ? ` (${group.projectName})` : ''}`
            ),
            datasets: [{
              label: 'Progress %',
              data: response.data.groups.map(group => group.progress),
              backgroundColor: '#F26522',
              borderColor: '#F26522',
              minBarLength: 5
            }]
          });
        }
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [API_URL]);

  // Fetch student data
  useEffect(() => {
    let isMounted = true;
    
    if (dashboardData?.groups) {
      const studentIds = dashboardData.groups.flatMap(group => group.id_students || []);
      const uniqueStudentIds = Array.from(new Set(studentIds.filter(id => id)));
      
      const fetchStudents = async () => {
        try {
          setStudentsLoading(true);
          setStudentsError(null);
          
          if (uniqueStudentIds.length === 0) {
            setStudentsData({});
            return;
          }

          const response = await axios.post<BulkUsersResponse>(
            `${API_URL}/tutor/bulk`,
            { ids: uniqueStudentIds },
            {
              headers: {
                Authorization: `${localStorage.getItem('token')}`
              }
            }
          );

          if (isMounted) {
            const studentsMap = response.data.users.reduce((acc: Record<string, User>, user: User) => {
              acc[user._id] = user;
              return acc;
            }, {});
            setStudentsData(studentsMap);
          }
        } catch (error) {
          if (isMounted) {
            console.error("Error fetching students:", error);
            setStudentsError("Failed to load student data");
          }
        } finally {
          if (isMounted) {
            setStudentsLoading(false);
          }
        }
      };
      
      fetchStudents();
    }

    return () => {
      isMounted = false;
    };
  }, [dashboardData, API_URL]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        },
        title: {
          display: true,
          text: 'Progress %'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Groups'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const group = dashboardData?.groups[context.dataIndex];
            return [
              `Group: ${group?.name}`,
              `Progress: ${context.raw}%`,
              `Tasks: ${group?.completedTasks}/${group?.totalTasks}`,
              `Project: ${group?.projectName || 'None'}`
            ];
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          <h4>Error Loading Dashboard</h4>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">No dashboard data available</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={getContentStyle()}>
      <div className="container-fluid py-3 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Tutor Dashboard</h1>
          <button 
            className="btn btn-outline-primary d-lg-none"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
          >
            <i className={`ti ti-${sidebarOpen ? 'layout-sidebar-right' : 'layout-sidebar'}`} />
          </button>
        </div>

        {/* Progress Chart Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h2 className="mb-0">Groups Progress</h2>
            <span className="badge bg-light text-primary">
              {dashboardData.groups.length} Groups
            </span>
          </div>
          <div className="card-body">
            <div style={{ height: '300px', minWidth: '100%' }}>
              {chartData ? (
                <Chart
                  type="bar"
                  data={chartData}
                  options={chartOptions}
                  style={{ width: '100%' }}
                />
              ) : (
                <div className="alert alert-info mb-0">No progress data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Groups List Section */}
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h2 className="mb-0">Groups Details</h2>
          </div>
          <div className="card-body">
            {dashboardData.groups.length === 0 ? (
              <div className="alert alert-info mb-0">No groups assigned to this tutor</div>
            ) : (
              <div className="row g-3">
                {dashboardData.groups.map(group => (
                  <div key={group._id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-light d-flex justify-content-between align-items-center">
                        <h3 className="h5 mb-0 text-truncate" title={group.name}>
                          {group.name}
                        </h3>
                        <span className="badge bg-primary">
                          {group.id_students?.length || 0}
                        </span>
                      </div>
                      <div className="card-body d-flex flex-column">
                        {/* Progress Section */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="small text-muted">Progress</span>
                            <span className="small text-muted">{group.progress}%</span>
                          </div>
                          <div className="progress" style={{ height: '10px' }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${group.progress}%` }}
                              aria-valuenow={group.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              {group.progress > 5 ? `${group.progress}%` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Tasks Info */}
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span className="small text-muted">Tasks:</span>
                            <strong>
                              {group.completedTasks}/{group.totalTasks}
                            </strong>
                          </div>
                        </div>

                        {/* Project Info */}
                        <div className="mb-3">
                          <span className="small text-muted d-block">Project:</span>
                          <strong className="text-truncate d-block" title={group.projectName || ''}>
                            {group.projectName || 'Not assigned'}
                          </strong>
                        </div>

                        {/* Students Section */}
                        <div className="mt-auto">
                          <button
                            className="btn btn-sm btn-outline-primary w-100 mb-2"
                            data-bs-toggle="collapse"
                            data-bs-target={`#students-${group._id}`}
                            aria-expanded="false"
                            aria-controls={`students-${group._id}`}
                          >
                            View Students
                          </button>
                          <div className="collapse" id={`students-${group._id}`}>
                            {studentsLoading ? (
                              <div className="text-center py-2">
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              </div>
                            ) : studentsError ? (
                              <div className="alert alert-danger py-2 mb-0 small">
                                {studentsError}
                              </div>
                            ) : (
                              <ul className="list-group list-group-flush small">
                                {group.id_students?.map(studentId => {
                                  const student = studentsData[studentId];
                                  return student ? (
                                    <li
                                      key={studentId}
                                      className="list-group-item list-group-item-action px-2 py-1 d-flex justify-content-between align-items-center"
                                      onClick={() => navigate(`/employee-dashboard/${studentId}`)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <span>
                                        {student.name} {student.lastname}
                                      </span>
                                      <i className="bi bi-chevron-right small text-muted"></i>
                                    </li>
                                  ) : (
                                    <li key={studentId} className="list-group-item text-muted px-2 py-1">
                                      Unknown student
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealsDashboard;