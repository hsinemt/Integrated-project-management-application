import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart } from "primereact/chart";

interface Group {
  _id: string;
  nom_groupe: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  projectName: string | null;
  projectId: string | null;
  studentCount: number;
}

interface DashboardData {
  tutorId: string;
  groups: Group[];
}

const DealsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('http://localhost:9777/tutor/groups-progress', {
          headers: {
            Authorization: `${localStorage.getItem('token')}`
          }
        });
        
        console.log("API Response Data:", response.data);
        
        if (!response.data) {
          throw new Error("Received empty response from server");
        }

        const data = response.data;
        setDashboardData(data);
        
        // Prepare chart data
        if (data.groups && data.groups.length > 0) {
          setChartData({
            labels: data.groups.map((group: Group) => 
              `${group.projectName ? ` (${group.projectName})` : ''}`
            ),
            datasets: [{
              label: 'Progress %',
              data: data.groups.map((group: Group) => group.progress),
              backgroundColor: '#F26522',
              borderColor: '#F26522',
              minBarLength: 5
            }]
          });
        }
      } catch (err: any) {
        console.error("API Error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
      
     

      {/* Groups Progress Section */}
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Groups Progress</h2>
        </div>
        <div className="card-body">
          {dashboardData.groups && dashboardData.groups.length > 0 ? (
            <>
              {/* Progress Chart */}
              <div style={{ height: '300px' }} className="mb-4">
                {chartData ? (
                  <Chart 
                    type="bar" 
                    data={chartData} 
                    options={chartOptions}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div className="alert alert-info">
                    No progress data available for chart
                  </div>
                )}
              </div>

              {/* Groups List */}
              <div className="row g-3">
                {dashboardData.groups.map(group => (
                  <div key={group._id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h3 className="h5 mb-0">{group.nom_groupe}</h3>
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

                        {/* Tasks Info */}
                        <div className="mb-2">
                          <span className="d-block text-muted small">Tasks Completed:</span>
                          <strong>
                            {group.completedTasks} / {group.totalTasks}
                          </strong>
                        </div>

                        {/* Students Count */}
                        <div className="mb-2">
                          <span className="d-block text-muted small">Students:</span>
                          <strong>{group.studentCount}</strong>
                        </div>

                        {/* Project Info */}
                        <div className="mb-2">
                          <span className="d-block text-muted small">Project:</span>
                          <strong>{group.projectName || 'No project assigned'}</strong>
                        </div>

                        {/* Project ID (hidden if null) */}
                        {group.projectId && (
                          <div>
                         
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="alert alert-info">
              No groups assigned to this tutor
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealsDashboard;