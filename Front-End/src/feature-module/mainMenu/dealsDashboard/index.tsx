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
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9777";

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
        console.log(response.data)
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
        <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="alert alert-danger m-3">
          <h4>Error Loading Dashboard</h4>
          <p>{error}</p>
          <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
    );
  }

  if (!dashboardData) {
    return <div className="alert alert-warning m-3">No dashboard data available</div>;
  }

  return (
      <div className="container py-3">
        <h1 className="mb-4">Tutor Dashboard</h1>

        {/* Progress Chart Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h2 className="mb-0">Groups Progress</h2>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {chartData ? (
                  <Chart
                      type="bar"
                      data={chartData}
                      options={chartOptions}
                      style={{ width: '100%' }}
                  />
              ) : (
                  <div className="alert alert-info">No progress data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Groups List Section */}
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h2 className="mb-0">Groups</h2>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {dashboardData.groups.map(group => (
                  <div key={group._id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h3 className="h5 mb-0">{group.name}</h3>
                      </div>
                      <div className="card-body">
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Progress</span>
                            <span>{group.progress}%</span>
                          </div>
                          <div className="progress" style={{ height: '20px' }}>
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

                        {/* Students List */}
                        <div className="mb-3">
                          <h5>Students ({group.id_students?.length || 0}):</h5>
                          {studentsLoading ? (
                              <div className="text-center py-2">
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              </div>
                          ) : studentsError ? (
                              <div className="alert alert-danger py-2">{studentsError}</div>
                          ) : (
                              <ul className="list-group">
                                {group.id_students?.map(studentId => {
                                  const student = studentsData[studentId];
                                  return student ? (
                                      <li
                                          key={studentId}
                                          className="list-group-item list-group-item-action"
                                          onClick={() => navigate(`/employee-dashboard/${studentId}`)}
                                          style={{ cursor: 'pointer' }}
                                      >
                                        {student.name} {student.lastname}
                                      </li>
                                  ) : (
                                      <li key={studentId} className="list-group-item text-muted">
                                        Unknown student
                                      </li>
                                  );
                                })}
                              </ul>
                          )}
                        </div>

                        {/* Group Info */}
                        <div className="mb-2">
                          <span className="d-block text-muted small">Tasks Completed:</span>
                          <strong>{group.completedTasks} / {group.totalTasks}</strong>
                        </div>
                        <div className="mb-2">
                          <span className="d-block text-muted small">Project:</span>
                          <strong>{group.projectName || 'No project assigned'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default DealsDashboard;