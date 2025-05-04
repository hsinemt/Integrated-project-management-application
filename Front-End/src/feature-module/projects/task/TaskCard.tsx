// components/TaskCard.tsx
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
    isCompletedColumn?: boolean;  // Add this prop
}

const TaskCard: React.FC<TaskCardProps> = ({ 
    task, 
    handleImageChange, 
    openModal, 
    onGitBranchUpdate,
    isCompletedColumn = false  // Default value
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

    // Add specific styling for completed tasks if needed
    const cardClasses = `card kanban-card mb-2 ${isCompletedColumn ? 'completed-task' : ''}`;

    return (
        <div key={task._id} className={cardClasses} data-task-id={task._id}>
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                        <span className={`badge me-2 ${
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
                    <p>Student: {task.assignedTo ? `${task.assignedTo.name} ${task.assignedTo.lastname}` : 'Unassigned'}</p>
                    <h6 className="d-flex align-items-center">{task.name}</h6>
                    <p
                        className="d-flex align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={toggleDescription}
                        title="Click to expand"
                    >
                        {showFullDescription ? task.description : getTruncatedText(task.description, 100)}
                    </p>
                </div>
                <p className="fw-medium mb-0">
                    Due on : <span className="text-gray-9">{new Date(task.date).toLocaleDateString()}</span>
                </p>
                <p className="fw-medium mb-0">
                    Estimated Time : <span className="text-gray-9">{task.estimatedTime}</span>
                </p>
                
                {/* Git Branch Input - Disable for completed tasks if needed */}
                <div className="mt-2 mb-2">
                    <label className="form-label">Git Branch:</label>
                    {isCompletedColumn ? (
                        <p>{gitBranch || 'No Git branch specified'}</p>
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
                            <p onClick={() => setIsEditingGit(true)} style={{ cursor: 'pointer' }}>
                                {gitBranch || 'Click to add Git branch'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2">
                    <div className="avatar-list-stacked avatar-group-sm me-3">
                        <span className="avatar avatar-rounded">
                            <img
                                className="border border-white"
                                src={task.image}
                                alt="img"
                                onClick={() => !isCompletedColumn && document.getElementById(`file-input-${task._id}`)?.click()}
                                style={{ cursor: isCompletedColumn ? 'default' : 'pointer' }}
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
                        className="btn btn-link" 
                        onClick={() => openModal(task.image)}
                        disabled={isCompletedColumn}
                    >
                        View Full Size
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;