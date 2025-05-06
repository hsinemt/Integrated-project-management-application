import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { Chart } from "primereact/chart";
import io from 'socket.io-client';

interface User {
  _id: string;
  name: string;
  lastname: string;
  email?: string;
}

interface Group {
  _id: string;
  nom_groupe: string;
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

interface Message {
  _id: string;
  group: string;
  sender: {
    _id: string;
    name: string;
    lastname: string;
    role: string;
  };
  content: string;
  timestamp: string;
}

const socket = io('http://localhost:9777', { autoConnect: false });

const DealsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<Record<string, User>>({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLoading, setTaskLoading] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(true);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

        const response = await axios.get(`${API_URL}/tutor/groups-progress`, {
          headers: {
            Authorization: `${localStorage.getItem('token')}`
          }
        });

        console.log("API Response Data:", response.data);

        if (!response.data || !response.data.groups) {
          throw new Error("Received invalid or empty response from server");
        }

        const data = response.data as DashboardData;
        setDashboardData(data);
        setUserId(data.tutorId);
        if (data.groups && data.groups.length > 0) {
          setChartData({
            labels: data.groups.map((group: Group) =>
              `${group.nom_groupe}${group.projectName ? ` (${group.projectName})` : ''}`
            ),
            datasets: [{
              label: 'Progress %',
              data: data.groups.map((group: Group) => group.progress),
              backgroundColor: '#F26522',
              borderColor: '#F26522',
              minBarLength: 5
            }]
          });
        } else {
          setChartData(null);
        }
      } catch (err: any) {
        console.error("API Error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
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

  // Socket.io setup
  useEffect(() => {
    if (userId) {
      socket.auth = { userId };
      socket.connect();
    }

    socket.on('receiveMessage', (message: Message) => {
      setMessages(prev => ({
        ...prev,
        [message.group]: [...(prev[message.group] || []), message]
      }));
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket.IO error:', error.message);
      setChatError(`Socket.IO error: ${error.message}`);
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setChatError('Socket.IO déconnecté. Veuillez vérifier la connexion au serveur.');
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('error');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    console.log('Chat state updated, isChatOpen:', isChatOpen, 'chatError:', chatError, 'newMessage:', newMessage, 'groupId:', groupId, 'userId:', userId);
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen, chatError, newMessage, groupId, userId]);

  const toggleChat = (groupId: string) => {
    if (isChatOpen === groupId) {
      setIsChatOpen(null);
    } else {
      setIsChatOpen(groupId);
      setIsChatExpanded(true);
      fetchMessages(groupId);
      socket.emit('joinGroup', { groupId, userId });
    }
  };

  const toggleChatExpand = () => {
    setIsChatExpanded(prev => !prev);
  };

  const fetchMessages = async (groupId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      const response = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => ({ ...prev, [groupId]: response.data.messages }));
      setChatError(null);
    } catch (error: any) {
      setChatError(error.response?.status === 401
        ? 'Session expirée. Veuillez vous reconnecter.'
        : `Impossible de charger les messages: ${error.message}`);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && isChatOpen && userId) {
      console.log('Sending message:', { groupId: isChatOpen, userId, content: newMessage });
      socket.emit('sendMessage', {
        groupId: isChatOpen,
        userId,
        content: newMessage,
      });
      setNewMessage('');
    } else {
      console.log('Cannot send message:', { newMessage, groupId: isChatOpen, userId });
      setChatError('Erreur: Impossible d\'envoyer le message. Vérifiez votre connexion ou reconnectez-vous.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input changed, new value:', e.target.value);
    setNewMessage(e.target.value);
  };

  const handleInputClick = () => {
    console.log('Input clicked');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

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

  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index][field] = value;
    setTasks(updatedTasks);
  };

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
        setTasks([]);
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
              `Group: ${group?.nom_groupe}`,
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

          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h2 className="mb-0">Groups Progress</h2>
              <span className="badge bg-light text-primary">
                {dashboardData.groups.length} Groups
              </span>
            </div>
            <div className="card-body">
              {dashboardData.groups && dashboardData.groups.length > 0 ? (
                  <>
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

                    <div className="row g-3">
                      {dashboardData.groups.map(group => (
                          <div key={group._id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                            <div className="card h-100 border-0 shadow-sm">
                              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                <h3 className="h5 mb-0 text-truncate" title={group.nom_groupe}>
                                  {group.nom_groupe}
                                </h3>
                                <div>
                                  <span className="badge bg-primary me-2">
                                    {group.id_students?.length || 0}
                                  </span>
                                  <button
                                    onClick={() => toggleChat(group._id)}
                                    className="btn btn-primary d-flex align-items-center justify-content-center"
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '50%',
                                      padding: '0',
                                      backgroundColor: '#f97316',
                                      color: '#fff'
                                    }}
                                    title={`Ouvrir la discussion pour ${group.nom_groupe}`}
                                  >
                                    <i className="ti ti-message-circle" style={{ fontSize: '16px' }}></i>
                                  </button>
                                </div>
                              </div>
                              <div className="card-body d-flex flex-column">
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

                                <div className="mb-2">
                                  <div className="d-flex justify-content-between">
                                    <span className="small text-muted">Tasks:</span>
                                    <strong>
                                      {group.completedTasks}/{group.totalTasks}
                                    </strong>
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <span className="d-block text-muted small">Students:</span>
                                  <strong>{group.studentCount}</strong>
                                </div>

                                <div className="mb-3">
                                  <span className="small text-muted d-block">Project:</span>
                                  <strong className="text-truncate d-block" title={group.projectName || ''}>
                                    {group.projectName || 'Not assigned'}
                                  </strong>
                                </div>

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
                  </>
              ) : (
                  <div className="alert alert-info">
                    No groups assigned to this tutor
                  </div>
              )}
            </div>
          </div>

          {isChatOpen && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                height: '100vh',
                width: isChatExpanded ? '300px' : '50px',
                backgroundColor: '#fff',
                boxShadow: '-2px 0 5px rgba(0,0,0,0.2)',
                zIndex: 2000,
                transition: 'width 0.3s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f97316',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {isChatExpanded && (
                  <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>
                    Discussion avec {dashboardData.groups.find(g => g._id === isChatOpen)?.nom_groupe}
                  </h3>
                )}
                <button
                  onClick={toggleChatExpand}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                  title={isChatExpanded ? 'Réduire' : 'Agrandir'}
                >
                  <i className={`ti ${isChatExpanded ? 'ti-chevron-right' : 'ti-chevron-left'}`} style={{ fontSize: '20px' }}></i>
                </button>
              </div>
              {isChatExpanded && (
                <>
                  <div
                    style={{
                      flex: 1,
                      padding: '10px',
                      overflowY: 'auto',
                      backgroundColor: '#fff',
                    }}
                  >
                    {chatError ? (
                      <div style={{ color: '#dc2626', textAlign: 'center', fontSize: '14px' }}>
                        {chatError}
                        <div>
                          <button
                            onClick={() => {
                              setChatError(null);
                              if (groupId) {
                                const token = localStorage.getItem('token');
                                if (token) {
                                  axios.get(`${API_URL}/messages/group/${groupId}`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  }).then(response => {
                                    setMessages(prev => ({ ...prev, [groupId]: response.data.messages }));
                                    setChatError(null);
                                  }).catch(err => {
                                    setChatError(`Erreur: ${err.message}`);
                                  });
                                }
                              }
                            }}
                            style={{
                              marginTop: '10px',
                              padding: '5px 10px',
                              backgroundColor: '#f97316',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Réessayer
                          </button>
                          {chatError.includes('Session expirée') && (
                            <button
                              onClick={() => {
                                localStorage.removeItem('token');
                                window.location.href = '/login';
                              }}
                              style={{
                                marginTop: '10px',
                                marginLeft: '10px',
                                padding: '5px 10px',
                                backgroundColor: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Reconnexion
                            </button>
                          )}
                        </div>
                      </div>
                    ) : messages[isChatOpen]?.length === 0 ? (
                      <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                        Aucun message pour le moment.
                      </div>
                    ) : (
                      messages[isChatOpen]?.map((message) => (
                        <div
                          key={message._id}
                          style={{
                            marginBottom: '10px',
                            textAlign: message.sender._id === userId ? 'right' : 'left',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '8px',
                              borderRadius: '6px',
                              backgroundColor: message.sender._id === userId ? '#f97316' : '#e5e7eb',
                              color: message.sender._id === userId ? '#fff' : '#111827',
                              fontSize: '14px',
                              maxWidth: '80%',
                            }}
                          >
                            <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 4px 0', color: message.sender._id === userId ? '#fff' : '#111827' }}>
                              {message.sender.name} {message.sender.lastname} ({message.sender.role})
                            </p>
                            <p style={{ margin: 0 }}>{message.content}</p>
                            <p style={{ fontSize: '10px', color: message.sender._id === userId ? '#fff' : '#6b7280', marginTop: '4px' }}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    onSubmit={sendMessage}
                    style={{
                      padding: '10px',
                      borderTop: '1px solid #e5e7eb',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex' }}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px 0 0 4px',
                          fontSize: '14px',
                          outline: 'none',
                          pointerEvents: 'auto',
                          cursor: 'text',
                          backgroundColor: '#fff',
                          zIndex: 2500,
                        }}
                        placeholder="Tapez votre message..."
                        disabled={!!chatError}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f97316',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0 4px 4px 0',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                        disabled={!!chatError}
                      >
                        Envoyer
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
  );
};

export default DealsDashboard;