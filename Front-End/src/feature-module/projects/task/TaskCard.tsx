// components/TaskCard.tsx
import React, { useState } from 'react';
import Modal from 'react-modal';
import styles from "./page.module.css";

interface Task {
    _id: string;
    name: string;
    description: string;
    priority: string;
    date: string;
    état: string;
    image: string;
    estimatedTime: string;
    student: {
        name: string;
        lastname: string;
    };
}

interface TaskCardProps {
    task: Task;
    handleImageChange: (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    openModal: (image: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, handleImageChange, openModal }) => {
    return (
        <div key={task._id} className="card kanban-card mb-2" data-task-id={task._id}>
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                        <span className="badge bg-outline-dark me-2">{task.priority}</span>
                    </div>
                </div>
                <div className="mb-2">
                <p>Student: {task.student.name} {task.student.lastname}</p>
                    <h6 className="d-flex align-items-center">{task.name}</h6>
                    <p className="d-flex align-items-center">{task.description}</p>

                </div>
                <p className="fw-medium mb-0">
                    Due on : <span className="text-gray-9">{new Date(task.date).toLocaleDateString()}</span>
                </p>
                <p className="fw-medium mb-0">
                    Estimated Time : <span className="text-gray-9">{task.estimatedTime}</span>
                </p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2">
                    <div className="avatar-list-stacked avatar-group-sm me-3">
                        <span className="avatar avatar-rounded">
                            <img
                                className="border border-white"
                                src={task.image}
                                alt="img"
                                onClick={() => document.getElementById(`file-input-${task._id}`)?.click()}
                            />
                            <input
                                type="file"
                                id={`file-input-${task._id}`}
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageChange(task._id, e)}
                            />
                        </span>
                    </div>
                    <button className="btn btn-link" onClick={() => openModal(task.image)}>View Full Size</button>
                </div>
            </div>
        </div>
    );
};
export default TaskCard;