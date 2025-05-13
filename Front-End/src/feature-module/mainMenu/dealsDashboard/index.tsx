import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { Chart } from "primereact/chart";
import io from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface User {
  _id: string;
  name: string;
  lastname: string;
  email?: string;
}

interface Group {
  _id: string;
  name?: string;             // Support both name formats
  nom_groupe?: string;       // Support both name formats
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
  tutor?: {
    name: string;
    lastname: string;
    role: string;
  };
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

interface Project {
  _id: string;
  title: string;
}

interface GroupOption {
  _id: string;
  nom_groupe: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(true);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('You');
  const [userLastname, setUserLastname] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('tutor');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
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
        // Set tutor info for chat
        setUserName(data.tutor?.name || 'You');
        setUserLastname(data.tutor?.lastname || '');
        setUserRole(data.tutor?.role || 'tutor');

        if (data.groups && data.groups.length > 0) {
          setChartData({
            labels: data.groups.map((group: Group) =>
                `${getGroupName(group)}${group.projectName ? ` (${group.projectName})` : ''}`
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

  // Helper function to get group name regardless of property naming
  const getGroupName = (group?: Group | null): string => {
    if (!group) return 'Unknown Group';
    return group.name || group.nom_groupe || 'Unknown Group';
  };

  // Fetch projects and groups
  useEffect(() => {
    const fetchProjectsAndGroups = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please log in.");
        navigate("/login");
        return;
      }

      try {
        const [projectsResponse, groupsResponse] = await Promise.all([
          axios.get(`${API_URL}/api/tasks/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/tasks/groups`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProjects(projectsResponse.data.projects || []);
        setGroups(groupsResponse.data.groups || []);
      } catch (err: any) {
        console.error("Error fetching projects or groups:", err);
        setError("Failed to load projects or groups");
      }
    };

    fetchProjectsAndGroups();
  }, [API_URL, navigate]);

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
      console.log('Received message:', message);
      setMessages(prev => {
        const updatedMessages = { ...prev };
        const groupMessages = updatedMessages[message.group] || [];
        // Remove temporary message and add server-confirmed message
        const filteredMessages = groupMessages.filter((msg) => !msg._id.startsWith('temp-'));
        if (!filteredMessages.some((msg) => msg._id === message._id)) {
          updatedMessages[message.group] = [...filteredMessages, message];
        }
        return updatedMessages;
      });
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket.IO error:', error.message);
      setChatError(`Socket.IO error: ${error.message}`);
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setChatError(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const toggleChat = (groupId: string) => {
    if (isChatOpen === groupId) {
      setIsChatOpen(null);
      setGroupName(null);
    } else {
      const selectedGroup = dashboardData?.groups.find(g => g._id === groupId);
      setIsChatOpen(groupId);
      setGroupName(getGroupName(selectedGroup));
      setIsChatExpanded(true);
      fetchMessages(groupId);
      socket.emit('joinGroup', { groupId, userId });
    }
  };

  const toggleChatExpand = () => {
    setIsChatExpanded(prev => !prev);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
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

      // Optimistic update with real sender data
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        _id: tempMessageId,
        group: isChatOpen,
        sender: {
          _id: userId,
          name: userName,
          lastname: userLastname,
          role: userRole,
        },
        content: newMessage,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => ({
        ...prev,
        [isChatOpen]: [...(prev[isChatOpen] || []), tempMessage]
      }));

      // Emit to server
      socket.emit('sendMessage', {
        groupId: isChatOpen,
        userId,
        content: newMessage,
      });
      setNewMessage('');
      setShowEmojiPicker(false);
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

  const handleReconnect = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const previewTasks = async () => {
    if (!projectId || !groupId) {
      setTaskError("Veuillez sélectionner un projet et un groupe.");
      return;
    }

    setTaskLoading(true);
    setTaskError(null);
    setTaskSuccess(null);

    try {
      const response = await axios.post<{ success: boolean; message: string; tasks: Task[] }>(
          `${API_URL}/api/tasks/preview`,
          {
            projectId,
            groupId,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
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
              Authorization: `Bearer ${localStorage.getItem('token')}`
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
              `Group: ${getGroupName(group)}`,
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
                <label htmlFor="projectSelect" className="form-label">Projet</label>
                <select
                    id="projectSelect"
                    className="form-select"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={taskLoading}
                >
                  <option value="">Sélectionnez un projet</option>
                  {projects.length === 0 && !taskLoading && (
                      <option disabled>Aucun projet disponible</option>
                  )}
                  {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.title}
                      </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="groupSelect" className="form-label">Groupe</label>
                <select
                    id="groupSelect"
                    className="form-select"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    disabled={taskLoading}
                >
                  <option value="">Sélectionnez un groupe</option>
                  {groups.length === 0 && !taskLoading && (
                      <option disabled>Aucun groupe disponible</option>
                  )}
                  {groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.nom_groupe}
                      </option>
                  ))}
                </select>
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
                                <h3 className="h5 mb-0 text-truncate" title={getGroupName(group)}>
                                  {getGroupName(group)}
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
                                      title={`Ouvrir la discussion pour ${getGroupName(group)}`}
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
                                                  <button
                                                      onClick={() =>
                                                          window.open(`http://localhost:3000/grades/${studentId}`, '_blank')
                                                      }
                                                      style={{
                                                        marginLeft: '10px',
                                                        padding: '5px 10px',
                                                        backgroundColor: '#1976d2',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                      }}
                                                  >
                                                    Évaluation
                                                  </button>
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
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: isChatExpanded ? '350px' : '60px',
                    background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                    boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
                    zIndex: 2000,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: '1px solid #e2e8f0',
                  }}
              >
                <div
                    style={{
                      padding: '12px 16px',
                      background: '#f97316',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                  {isChatExpanded && (
                      <h3 style={{
                        fontSize: '18px',
                        margin: 0,
                        fontWeight: 600,
                        letterSpacing: '0.2px'
                      }}>
                        {groupName}
                      </h3>
                  )}
                  <button
                      onClick={toggleChatExpand}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s',
                      }}
                      title={isChatExpanded ? 'Minimize' : 'Expand'}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <i className={`ti ${isChatExpanded ? 'ti-chevron-right' : 'ti-chevron-left'}`} style={{ fontSize: '24px' }}></i>
                  </button>
                </div>
                {isChatExpanded && (
                    <>
                      <div
                          style={{
                            flex: 1,
                            padding: '16px',
                            overflowY: 'auto',
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                      >
                        {chatError ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '16px',
                              background: '#fef2f2',
                              borderRadius: '8px',
                              color: '#dc2626',
                              fontSize: '14px',
                              border: '1px solid #fee2e2'
                            }}>
                              {chatError}
                              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                      setChatError(null);
                                      if (isChatOpen) {
                                        fetchMessages(isChatOpen);
                                      }
                                    }}
                                    style={{
                                      padding: '8px 16px',
                                      background: '#f97316',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                                >
                                  Retry
                                </button>
                                {chatError.includes('Session expirée') && (
                                    <button
                                        onClick={handleReconnect}
                                        style={{
                                          padding: '8px 16px',
                                          background: '#dc2626',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                    >
                                      Reconnect
                                    </button>
                                )}
                              </div>
                            </div>
                        ) : !messages[isChatOpen] || messages[isChatOpen]?.length === 0 ? (
                            <div style={{
                              color: '#6b7280',
                              textAlign: 'center',
                              fontSize: '14px',
                              padding: '24px',
                              fontStyle: 'italic'
                            }}>
                              No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages[isChatOpen]?.map((message) => (
                                <div
                                    key={message._id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: message.sender._id === userId ? 'row-reverse' : 'row',
                                      gap: '8px',
                                      marginBottom: '12px',
                                      opacity: 0,
                                      animation: 'fadeIn 0.3s ease-in forwards',
                                    }}
                                >
                                  <div
                                      style={{
                                        maxWidth: '70%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        background: message.sender._id === userId
                                            ? 'linear-gradient(135deg, #f97316, #fb923c)'
                                            : '#f1f5f9',
                                        color: message.sender._id === userId ? '#ffffff' : '#1f2937',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.2s',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                  >
                                    <p style={{
                                      fontWeight: 600,
                                      fontSize: '13px',
                                      margin: '0 0 6px 0',
                                      color: message.sender._id === userId ? '#ffffff' : '#1f2937'
                                    }}>
                                      {message.sender.name} {message.sender.lastname}
                                      <span style={{ fontWeight: 400, color: message.sender._id === userId ? '#fed7aa' : '#6b7280' }}>
                                        ({message.sender.role})
                                      </span>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                      {message.content}
                                    </p>
                                    <p style={{
                                      fontSize: '11px',
                                      color: message.sender._id === userId ? '#fed7aa' : '#9ca3af',
                                      marginTop: '6px',
                                      textAlign: 'right'
                                    }}>
                                      {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      <div
                          style={{
                            padding: '12px 16px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#ffffff',
                            boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
                            position: 'relative',
                          }}
                      >
                        {showEmojiPicker && (
                            <div
                                style={{
                                  position: 'absolute',
                                  bottom: '60px',
                                  right: '16px',
                                  zIndex: 1000,
                                }}
                            >
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          transition: 'border-color 0.2s'
                        }}
                             onFocus={(e) => e.currentTarget.style.borderColor = '#f97316'}
                             onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                          <input
                              ref={inputRef}
                              type="text"
                              value={newMessage}
                              onChange={handleInputChange}
                              onClick={handleInputClick}
                              style={{
                                flex: 1,
                                padding: '12px 16px',
                                border: 'none',
                                fontSize: '14px',
                                outline: 'none',
                                background: 'transparent',
                                color: '#1f2937',
                                cursor: chatError ? 'not-allowed' : 'text',
                              }}
                              placeholder="Type your message..."
                              disabled={!!chatError}
                          />
                          <button
                              ref={emojiButtonRef}
                              type="button"
                              onClick={toggleEmojiPicker}
                              style={{
                                padding: '8px 12px',
                                background: showEmojiPicker ? '#f1f5f9' : 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: chatError ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                              }}
                              title="Add emoji"
                              disabled={!!chatError}
                          >
                            😊
                          </button>
                          <button
                              onClick={sendMessage}
                              style={{
                                padding: '12px 16px',
                                background: '#f97316',
                                color: '#ffffff',
                                border: 'none',
                                cursor: chatError ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                transition: 'background-color 0.2s',
                              }}
                              disabled={!!chatError}
                              onMouseEnter={(e) => !chatError && (e.currentTarget.style.backgroundColor = '#ea580c')}
                              onMouseLeave={(e) => !chatError && (e.currentTarget.style.backgroundColor = '#f97316')}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                )}
              </div>
          )}
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
        </div>
      </div>
  );
};

export default DealsDashboard;