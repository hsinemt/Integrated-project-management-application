import React, { useEffect, useState } from "react";
import axios, {AxiosError} from "axios";
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

interface Task {
  name: string;
  description: string;
  priority: string;
  date: string;
  état: string;
  project: string;
  group: string;
  assignedTo: string;
}

const DealsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  // États pour la génération de tâches
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLoading, setTaskLoading] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9777";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/tutor/groups-progress`, {
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

  // Fonction pour générer les tâches (preview)
  const previewTasks = async () => {
    if (!projectId || !groupId) {
      setTaskError("Veuillez entrer un ID de projet et un ID de groupe.");
      return;
    }

    setTaskLoading(true);
    setTaskError(null);
    setTaskSuccess(null);

    try {
      const response = await axios.post<{ success: boolean; message: string; tasks: Task[] }>(
          `${API_URL}/api/tasks/preview`,
          {
            projectId: projectId,
            groupId: groupId,
          },
          {
            headers: {
              Authorization: `${localStorage.getItem('token')}`
            }
          }
      );

      if (response.data.success) {
        setTasks(response.data.tasks);
        setTaskSuccess(response.data.message);
      } else {
        setTaskError(response.data.message || "Erreur inattendue lors de la génération des tâches.");
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setTaskError(error.response?.data?.message || "Erreur serveur lors de la génération des tâches.");
      console.error("Erreur génération tâches :", error.message);
    } finally {
      setTaskLoading(false);
    }
  };

  // Fonction pour gérer les modifications des champs des tâches
  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index][field] = value;
    setTasks(updatedTasks);
  };

  // Fonction pour enregistrer les tâches modifiées
  const saveTasks = async () => {
    if (tasks.length === 0) {
      setTaskError("Aucune tâche à enregistrer.");
      return;
    }

    setTaskLoading(true);
    setTaskError(null);
    setTaskSuccess(null);

    try {
      const response = await axios.post<{ success: boolean; message: string; tasks: Task[] }>(
          `${API_URL}/api/tasks/save`,
          {
            tasks: tasks,
          },
          {
            headers: {
              Authorization: `${localStorage.getItem('token')}`
            }
          }
      );

      if (response.data.success) {
        setTaskSuccess(response.data.message);
        setTasks([]); // Réinitialiser les tâches après l'enregistrement
      } else {
        setTaskError(response.data.message || "Erreur inattendue lors de l'enregistrement des tâches.");
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setTaskError(error.response?.data?.message || "Erreur serveur lors de l'enregistrement des tâches.");
      console.error("Erreur enregistrement tâches :", error.message);
    } finally {
      setTaskLoading(false);
    }
  };

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

        {/* Section : Générer et Modifier des Tâches */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h2 className="mb-0">Générer et Modifier des Tâches</h2>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="projectIdInput" className="form-label">ID du Projet</label>
              <input
                  type="text"
                  id="projectIdInput"
                  className="form-control"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Entrez l'ID du projet"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="groupIdInput" className="form-label">ID du Groupe</label>
              <input
                  type="text"
                  id="groupIdInput"
                  className="form-control"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="Entrez l'ID du groupe"
              />
            </div>
            <button
                type="button"
                onClick={previewTasks}
                disabled={taskLoading || !projectId || !groupId}
                className="btn btn-primary mb-3"
            >
              {taskLoading ? "Génération en cours..." : "Générer les tâches"}
            </button>

            {taskError && (
                <div className="alert alert-danger mt-3" role="alert">
                  {taskError}
                </div>
            )}

            {taskSuccess && (
                <div className="alert alert-success mt-3" role="alert">
                  {taskSuccess}
                </div>
            )}

            {tasks.length > 0 && (
                <div className="mt-3">
                  <h6>Tâches générées ({tasks.length})</h6>
                  <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {tasks.map((task, index) => (
                        <div key={index} className="list-group-item mb-3 border rounded">
                          <div className="mb-2">
                            <label className="form-label">Nom:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={task.name}
                                onChange={(e) => handleTaskChange(index, "name", e.target.value)}
                            />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Description:</label>
                            <textarea
                                className="form-control"
                                value={task.description}
                                onChange={(e) => handleTaskChange(index, "description", e.target.value)}
                            />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Priorité:</label>
                            <select
                                className="form-select"
                                value={task.priority}
                                onChange={(e) => handleTaskChange(index, "priority", e.target.value)}
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="mb-2">
                            <label className="form-label">État:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={task.état}
                                onChange={(e) => handleTaskChange(index, "état", e.target.value)}
                            />
                          </div>
                          <small>
                            Assigné à : {task.assignedTo} | Date : {new Date(task.date).toLocaleDateString()}
                          </small>
                        </div>
                    ))}
                  </div>
                  <button
                      type="button"
                      onClick={saveTasks}
                      disabled={taskLoading || tasks.length === 0}
                      className="btn btn-success mt-3"
                  >
                    {taskLoading ? "Enregistrement en cours..." : "Enregistrer toutes les tâches"}
                  </button>
                </div>
            )}
          </div>
        </div>

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