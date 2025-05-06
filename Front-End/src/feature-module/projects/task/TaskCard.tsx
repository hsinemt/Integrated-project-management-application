import React, { useState } from 'react';
import styles from "./page.module.css";
import axios from 'axios';

interface Task {
    _id: string;
    name: string;
    description: string;
    priority: string;
    date: string;
    état: string;
    image: string;
    git?: string;
    estimatedTime: string;
    assignedTo: {
        name: string;
        lastname: string;
    };
}

interface TaskCardProps {
    task: Task;
    handleImageChange: (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    openModal: (image: string) => void;
    onGitBranchUpdate?: (taskId: string, gitBranch: string) => void;
    isCompletedColumn?: boolean;
    openCamera?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
    task, 
    handleImageChange, 
    openModal, 
    onGitBranchUpdate,
    isCompletedColumn = false,
    openCamera
}) => {
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [gitBranch, setGitBranch] = useState(task.git || '');
    const [isEditingGit, setIsEditingGit] = useState(false);

    const toggleDescription = () => setShowFullDescription(prev => !prev);

    const getTruncatedText = (text: string, maxLength: number) =>
        text.length > maxLength ? text.slice(0, maxLength) + '...' : text;

    const handleGitBranchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGitBranch(e.target.value);
    };

    const saveGitBranch = async () => {
        try {
            const response = await axios.put(
                `http://localhost:9777/api/tasks/tasks/${task._id}/git`,
                { git: gitBranch }
            );
            
            if (onGitBranchUpdate) {
                onGitBranchUpdate(task._id, gitBranch);
            }
            
            setIsEditingGit(false);
            console.log('Git branch updated successfully:', response.data);
        } catch (error) {
            console.error('Error updating git branch:', error);
            alert('Failed to update git branch. Please try again.');
        }
    };

    const cardClasses = `card kanban-card mb-3 shadow-sm ${isCompletedColumn ? 'completed-task' : ''}`;

    return (
        <div key={task._id} className={cardClasses} data-task-id={task._id}>
            <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                        <span className={`badge me-2 px-2 py-1 ${
                            isCompletedColumn 
                                ? 'bg-success' 
                                : task.priority === 'High' 
                                    ? 'bg-danger' 
                                    : task.priority === 'Medium' 
                                        ? 'bg-warning' 
                                        : 'bg-outline-dark'
                        }`}>
                            {task.priority}
                        </span>
                    </div>
                </div>
                <div className="mb-2">
                    <p className="mb-1 text-muted">
                        Student: {task.assignedTo ? `${task.assignedTo.name} ${task.assignedTo.lastname}` : 'Unassigned'}
                    </p>
                    <h6 className="mb-1 font-weight-bold">{task.name}</h6>
                    <p
                        className="text-muted mb-0"
                        style={{ cursor: 'pointer', lineHeight: '1.5' }}
                        onClick={toggleDescription}
                        title="Click to expand"
                    >
                        {showFullDescription ? task.description : getTruncatedText(task.description, 100)}
                    </p>
                </div>
                <div className="mb-2">
                    <p className="mb-1 fw-medium">
                        Due on: <span className="text-muted">{new Date(task.date).toLocaleDateString()}</span>
                    </p>
                    <p className="mb-0 fw-medium">
                        Estimated Time: <span className="text-muted">{task.estimatedTime}</span>
                    </p>
                </div>
                
                <div className="mb-3">
                    <label className="form-label fw-medium mb-1">Git Branch:</label>
                    {isCompletedColumn ? (
                        <p className="text-muted mb-0">{gitBranch || 'No Git branch specified'}</p>
                    ) : isEditingGit ? (
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                value={gitBranch}
                                onChange={handleGitBranchChange}
                                placeholder="Enter Git branch path"
                            />
                            <button className="btn btn-success" onClick={saveGitBranch}>
                                Save
                            </button>
                            <button className="btn btn-secondary" onClick={() => setIsEditingGit(false)}>
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p
                                className="text-muted mb-0"
                                onClick={() => setIsEditingGit(true)}
                                style={{ cursor: 'pointer' }}
                            >
                                {gitBranch || 'Click to add Git branch'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="d-flex align-items-center justify-content-between border-top pt-2 mb-2">
                    <div className="avatar-list-stacked avatar-group-sm me-3">
                        <span className="avatar avatar-rounded" style={{ width: '40px', height: '40px' }}>
                            <img
                                className="border border-white rounded-circle"
                                src={task.image}
                                alt="img"
                                onClick={() => !isCompletedColumn && document.getElementById(`file-input-${task._id}`)?.click()}
                                style={{ cursor: isCompletedColumn ? 'default' : 'pointer', width: '100%', height: '100%' }}
                            />
                            {!isCompletedColumn && (
                                <input
                                    type="file"
                                    id={`file-input-${task._id}`}
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleImageChange(task._id, e)}
                                />
                            )}
                        </span>
                    </div>
                    <button 
                        className="btn btn-link text-primary p-0"
                        onClick={() => openModal(task.image)}
                        disabled={isCompletedColumn}
                    >
                        View Full Size
                    </button>
                </div>

                {isCompletedColumn && openCamera && (
                    <button
                        className="btn btn-primary d-flex align-items-center justify-content-center w-100 mt-2"
                        style={{
                            backgroundColor: '#f97316',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                        }}
                        onClick={openCamera}
                    >
                        <i className="ti ti-camera me-2"></i> Verify to Pass Quiz
                    </button>
                )}
            </div>
        </div>
    );
};

export default TaskCard;