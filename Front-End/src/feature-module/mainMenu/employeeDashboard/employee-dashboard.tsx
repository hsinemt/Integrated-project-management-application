import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Task {
  _id: string;
  name: string;
  description: string;
  priority: string;
  date: string;
  état: string;
  noteGit?: string;
  image?: string;
  commits?: Commit[];
  git?: string;
}

interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface StudentInfo {
  name: string;
  lastname: string;
}

interface CommitData {
  message: string;
  timestamp: string;
}

interface StatusHistory {
  status: string;
  changedAt: string;
  changedBy?: string;
}

const StudentTasksPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9777';
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [editingGitNote, setEditingGitNote] = useState<string | null>(null);
  const [tempGitNote, setTempGitNote] = useState("");
  const [showCommitsModal, setShowCommitsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentTaskCommits, setCurrentTaskCommits] = useState<CommitData[]>([]);
  const [currentTaskHistory, setCurrentTaskHistory] = useState<StatusHistory[]>([]);
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/tasks/tasks/${taskId}/status`,
        { etat: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, état: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  const handleSaveGitNote = async (taskId: string) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/tasks/${taskId}/note-git`,
        { noteGit: tempGitNote },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, noteGit: tempGitNote } : task
      ));
      setEditingGitNote(null);
    } catch (error) {
      console.error('Error saving Git note:', error);
      alert('Failed to save Git note. Please try again.');
    }
  };

  const fetchCommits = async (taskId: string, taskName: string) => {
    if (!taskId) return;
    
    try {
      setCommitsLoading(true);
      setCommitsError(null);
      setCurrentTaskName(taskName);
      
      const response = await axios.get(`${API_URL}/api/tasks/${taskId}/commits`, {
        headers: {
          Authorization: `${localStorage.getItem('token')}`
        }
      });
     
      
      setCurrentTaskCommits(response.data.commits || []);
      setShowCommitsModal(true);
    } catch (err) {
      console.error('Failed to load commits:', err);
      let errorMessage = 'Failed to load commit history';
      
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) {
          errorMessage = 'Tutor GitHub token not configured';
        } else if (err.response?.status === 403) {
          errorMessage = 'GitHub rate limit exceeded or tutor token invalid';
        } else {
          errorMessage = err.response?.data?.message || err.message;
        }
      }
      
      setCommitsError(errorMessage);
    } finally {
      setCommitsLoading(false);
    }
  };

  const fetchTaskHistory = async (taskId: string, taskName: string) => {
    if (!taskId) return;
    
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      setCurrentTaskName(taskName);
      
      const response = await axios.get(`${API_URL}/api/tasks/${taskId}/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setCurrentTaskHistory(response.data.history || []);
      setShowHistoryModal(true);
    } catch (err) {
      console.error('Failed to load task history:', err);
      let errorMessage = 'Failed to load task history';
      
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message;
      }
      
      setHistoryError(errorMessage);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!studentId || !/^[0-9a-fA-F]{24}$/.test(studentId)) {
        setError('Invalid student ID format');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const endpoint = `${API_URL}/api/tasks/by-student/${studentId}`;
        console.log('Fetching tasks from:', endpoint);
        const response = await axios.get(endpoint);
        console.log('API Response:', response.data);
        const tasksData = response.data.success ? response.data.tasks : [];
        setTasks(tasksData);
        setStudent(response.data.student);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (axios.isAxiosError(err)) {
          const message = err.response?.data?.message || err.message;
          setError(`Failed to load tasks: ${message}`);
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [studentId, API_URL]);

  if (loading) {
    return (
      <div className="dashboard-container" style={getContentStyle()}>
        <div className="container-fluid py-3 px-4 d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={getContentStyle()}>
        <div className="container-fluid py-3 px-4">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <i className="fas fa-exclamation-circle text-danger fa-3x mb-3"></i>
              <h4 className="card-title">Error Loading Tasks</h4>
              <p className="card-text text-muted">Error: {error} (Student ID: {studentId})</p>
              <div className="d-flex justify-content-center gap-2">
                <button onClick={() => navigate(-1)} className="btn btn-outline-secondary btn-rounded">
                  <i className="fas fa-arrow-left me-2"></i>Back to Groups
                </button>
                <button onClick={() => window.location.reload()} className="btn btn-primary btn-rounded">
                  <i className="fas fa-redo me-2"></i>Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={getContentStyle()}>
      <div className="container-fluid py-3 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">
            Tasks for {student?.name} {student?.lastname}
          </h2>
          <button 
            className="btn btn-outline-primary btn-rounded d-lg-none"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
          >
            <i className={`ti ti-${sidebarOpen ? 'layout-sidebar-right' : 'layout-sidebar'}`} />
          </button>
        </div>
        
        {tasks.length > 0 ? (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">Task List</h3>
              <span className="badge bg-light text-primary">{tasks.length} Tasks</span>
            </div>
            <div className="card-body">
              {tasks.map((task) => (
                <div key={task._id} className="task-card mb-3 p-3 rounded shadow-sm hover-shadow">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h4 className="task-title mb-0">{task.name}</h4>
                    <span
                      className={`badge ${
                        task.état === 'Completed'
                          ? 'bg-success'
                          : task.état === 'In Progress'
                          ? 'bg-warning text-dark'
                          : task.état === 'In Review'
                          ? 'bg-info text-dark'
                          : 'bg-secondary'
                      } badge-rounded`}
                    >
                      {task.état}
                    </span>
                  </div>
                  <p className="task-description mb-2">{task.description}</p>
                  
                  {task.image && (
                    <div className="mb-3">
                      <img 
                        src={task.image} 
                        alt={`Task ${task.name}`} 
                        className="img-fluid rounded"
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  
                  <div className="task-meta text-muted mb-3">
                    <span>Due: {new Date(task.date).toLocaleDateString()}</span> | 
                    <span> Priority: {task.priority}</span>
                  </div>
                  
                  <div className="task-notes mb-3">
                    {editingGitNote === task._id ? (
                      <div className="input-group">
                        <textarea
                          className="form-control"
                          value={tempGitNote}
                          onChange={(e) => setTempGitNote(e.target.value)}
                          placeholder="Add notes about this task..."
                          rows={3}
                        />
                        <button 
                          className="btn btn-success btn-rounded" 
                          onClick={() => handleSaveGitNote(task._id)}
                        >
                          <i className="fas fa-check me-2"></i>Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-rounded" 
                          onClick={() => setEditingGitNote(null)}
                        >
                          <i className="fas fa-times me-2"></i>Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h6 className="notes-title">Notes</h6>
                        <p className="notes-content">{task.noteGit || "No notes added yet"}</p>
                        <div className="d-flex gap-2 flex-wrap">
                          <button 
                            className="btn btn-primary btn-sm btn-rounded"
                            onClick={() => {
                              setEditingGitNote(task._id);
                              setTempGitNote(task.noteGit || "");
                            }}
                          >
                            <i className="fas fa-edit me-2"></i>{task.noteGit ? "Edit Note" : "Add Note"}
                          </button>
                          {task.git && (
                            <button 
                              className="btn btn-info btn-sm btn-rounded"
                              onClick={() => fetchCommits(task._id, task.name)}
                              disabled={commitsLoading}
                            >
                              <i className="fas fa-code-branch me-2"></i>
                              {commitsLoading ? 'Loading...' : 'Commits'}
                            </button>
                          )}
                          <button 
                            className="btn btn-outline-secondary btn-sm btn-rounded"
                            onClick={() => fetchTaskHistory(task._id, task.name)}
                            disabled={historyLoading}
                          >
                            <i className="fas fa-history me-2"></i>
                            {historyLoading ? 'Loading...' : 'History'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {task.état === 'In Review' && (
                    <div className="d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-success btn-rounded"
                        onClick={() => updateTaskStatus(task._id, 'Completed')}
                      >
                        <i className="fas fa-check me-2"></i>Approve
                      </button>
                      <button 
                        className="btn btn-danger btn-rounded"
                        onClick={() => updateTaskStatus(task._id, 'To Do')}
                      >
                        <i className="fas fa-times me-2"></i>Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <i className="fas fa-tasks text-muted fa-3x mb-3"></i>
              <h4 className="card-title">No Tasks Found</h4>
              <p className="card-text text-muted">No tasks assigned to student {studentId}.</p>
              <button onClick={() => navigate(-1)} className="btn btn-outline-primary btn-rounded">
                <i className="fas fa-arrow-left me-2"></i>Back to Groups
              </button>
            </div>
          </div>
        )}
        
        {/* Commits Modal */}
        <div className={`modal fade ${showCommitsModal ? 'show d-block' : 'd-none'}`} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Commit History: {currentTaskName}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowCommitsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {commitsLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading commit history...</p>
                  </div>
                ) : commitsError ? (
                  <div className="alert alert-danger">{commitsError}</div>
                ) : currentTaskCommits.length === 0 ? (
                  <div className="alert alert-info">No commits found for this task</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTaskCommits.map((commit, index) => (
                          <tr key={index}>
                            <td>{new Date(commit.timestamp).toLocaleString()}</td>
                            <td>{commit.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-rounded" 
                  onClick={() => setShowCommitsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        {showCommitsModal && <div className="modal-backdrop fade show"></div>}

        {/* Task History Modal */}
        <div className={`modal fade ${showHistoryModal ? 'show d-block' : 'd-none'}`} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Task Status History: {currentTaskName}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {historyLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading task history...</p>
                  </div>
                ) : historyError ? (
                  <div className="alert alert-danger">{historyError}</div>
                ) : currentTaskHistory.length === 0 ? (
                  <div className="alert alert-info">No status history found for this task</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTaskHistory.map((history, index) => (
                          <tr key={index}>
                            <td>{new Date(history.changedAt).toLocaleString()}</td>
                            <td>{history.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-rounded" 
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        {showHistoryModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </div>
  );
};

export default StudentTasksPage;