// components/TaskColumn.tsx
import React, { forwardRef } from 'react';
import TaskCard from './TaskCard';

interface Task {
    _id: string;
    name: string;
    description: string;
    priority: string;
    date: string;
    état: string;
    image: string;
}

interface TaskColumnProps {
    etat: string;
    tasks: Task[];
    handleImageChange: (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    openModal: (image: string) => void;
}

const TaskColumn = forwardRef<HTMLDivElement, TaskColumnProps>(({ etat, tasks, handleImageChange, openModal }, ref) => {
    return (
        <div className="p-3 rounded bg-transparent-secondary w-100 me-3">
            <div className="bg-white p-2 rounded mb-2">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <span className="bg-soft-purple p-1 d-flex rounded-circle me-2">
                            <span className="bg-purple rounded-circle d-block p-1" />
                        </span>
                        <h5 className="me-2">{etat}</h5>
                        <span className="badge bg-light rounded-pill">{tasks.length}</span>
                    </div>
                </div>
            </div>
            <div className="kanban-drag-wrap" ref={ref} data-etat={etat}>
                {tasks.map((task) => (
                    <TaskCard
                        key={task._id}
                        task={task}
                        handleImageChange={handleImageChange}
                        openModal={openModal}
                    />
                ))}
            </div>
        </div>
    );
});

export default TaskColumn;