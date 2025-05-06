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
  const [currentTaskCommits, setCurrentTaskCommits] = useState<CommitData[]>([]);
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await axios.put(
        `http://localhost:9777/api/tasks/tasks/${taskId}/status`,
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
    return <div className="spinner-border text-primary" role="status" />;
  }

  if (error) {
    return (
      <div className="container py-4">
        <br />
        <br />
        <button onClick={() => navigate(-1)} className="btn btn-secondary mb-3">
          ← Back to Groups
        </button>
        <div className="alert alert-danger">
          Error: {error} (Student ID: {studentId})
          <button
            onClick={() => window.location.reload()}
            className="btn btn-sm btn-danger ms-3"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <br />
      <br />
          
      <button onClick={() => navigate(-1)} className="btn btn-secondary mb-3">
        ← Back to Groups
      </button>
      <h2 className="mb-4">
        Tasks for Student: {student?.name} {student?.lastname}
      </h2>
      
      {/* Commits Modal */}
      <div className={`modal fade ${showCommitsModal ? 'show d-block' : 'd-none'}`} tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Commit History: {currentTaskName}</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowCommitsModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              {commitsLoading ? (
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p>Loading commit history...</p>
                </div>
              ) : commitsError ? (
                <div className="alert alert-danger">{commitsError}</div>
              ) : currentTaskCommits.length === 0 ? (
                <div className="alert alert-info">No commits found for this task</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
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
                className="btn btn-secondary" 
                onClick={() => setShowCommitsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {showCommitsModal && <div className="modal-backdrop fade show"></div>}
      
      {tasks.length > 0 ? (
        <div className="list-group">
          {tasks.map((task) => (
            <div key={task._id} className="list-group-item mb-3">
              <div className="d-flex justify-content-between">
                <h5>{task.name}</h5>
                <span
                  className={`badge ${
                    task.état === 'Completed'
                      ? 'bg-success'
                      : task.état === 'In Progress'
                      ? 'bg-warning text-dark'
                      : task.état === 'In Review'
                      ? 'bg-info text-dark'
                      : 'bg-secondary'
                  }`}
                >
                  {task.état}
                </span>
              </div>
              <p className="mb-1">{task.description}</p>
              
              {task.image && (
                <div className="mb-2">
                  <img 
                    src={task.image} 
                    alt={`Task ${task.name}`} 
                    className="img-fluid rounded"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}
              
              <small className="text-muted d-block mb-2">
                Due: {new Date(task.date).toLocaleDateString()} | Priority: {task.priority}
              </small>
              
              <div className="mt-2">
                {editingGitNote === task._id ? (
                  <div className="input-group">
                    <textarea
                      className="form-control"
                      value={tempGitNote}
                      onChange={(e) => setTempGitNote(e.target.value)}
                      placeholder="Add notes about this task..."
                    />
                    <button 
                      className="btn btn-success" 
                      onClick={() => handleSaveGitNote(task._id)}
                    >
                      Save
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setEditingGitNote(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <h6>Notes:</h6>
                    <p>{task.noteGit || "No notes added yet"}</p>
                    <button 
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => {
                        setEditingGitNote(task._id);
                        setTempGitNote(task.noteGit || "");
                      }}
                    >
                      {task.noteGit ? "Edit Note" : "Add Note"}
                    </button>
                    {task.git && (
                      <button 
                        className="btn btn-info btn-sm"
                        onClick={() => fetchCommits(task._id, task.name)}
                        disabled={commitsLoading}
                      >
                        {commitsLoading ? 'Loading...' : 'Show Commit History'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Add these buttons - only show when task is "In Review" */}
              {task.état === 'In Review' && (
                <div className="mt-3 d-flex gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={() => updateTaskStatus(task._id, 'Completed')}
                  >
                    <i className="fas fa-check me-1"></i> Approve (Mark as Completed)
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => updateTaskStatus(task._id, 'To Do')}
                  >
                    <i className="fas fa-times me-1"></i> Reject (Return to To Do)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info">No tasks found for student {studentId}</div>
      )}
    </div>
  );
};

export default StudentTasksPage;