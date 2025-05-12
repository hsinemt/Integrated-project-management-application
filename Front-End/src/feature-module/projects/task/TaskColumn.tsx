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
    git?: string;
    quizTheme?: string;
    quizScore?: number;
    quizId?: string;
    estimatedTime: string;
    assignedTo: {
        name: string;
        lastname: string;
    };
}

interface TaskColumnProps {
    etat: string;
    tasks: Task[];
    handleImageChange: (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    openModal: (image: string) => void;
    onGitBranchUpdate?: (taskId: string, gitBranch: string) => void;
    isCompletedColumn?: boolean;
    openQuizForTask?: (taskId: string, quizTheme: string) => void;
    openCamera?: () => void;
    changingTaskIds?: Set<string>;
}

const TaskColumn = forwardRef<HTMLDivElement, TaskColumnProps>(({ 
    etat, 
    tasks, 
    handleImageChange, 
    openModal, 
    onGitBranchUpdate,
    isCompletedColumn = false,
    openCamera,
    changingTaskIds = new Set(),
    openQuizForTask

}, ref) => {
    const columnClasses = `p-3 rounded w-100 me-3 ${
        isCompletedColumn 
            ? 'bg-soft-success'
            : 'bg-transparent-secondary'
    }`;

    const headerClasses = `p-2 rounded mb-2 ${
        isCompletedColumn
            ? 'bg-success text-white'
            : 'bg-white'
    }`;

    return (
        <div className={columnClasses}>
            <div className={headerClasses}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <span className={`p-1 d-flex rounded-circle me-2 ${
                            isCompletedColumn 
                                ? 'bg-soft-light' 
                                : 'bg-soft-purple'
                        }`}>
                            <span className={`rounded-circle d-block p-1 ${
                                isCompletedColumn 
                                    ? 'bg-light' 
                                    : 'bg-purple'
                            }`} />
                        </span>
                        <h5 className={`me-2 ${isCompletedColumn ? 'text-white' : ''}`}>
                            {etat}
                        </h5>
                        <span className={`badge rounded-pill ${
                            isCompletedColumn 
                                ? 'bg-light text-dark' 
                                : 'bg-light'
                        }`}>
                            {tasks.length}
                        </span>
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
                        onGitBranchUpdate={onGitBranchUpdate}
                        isCompletedColumn={isCompletedColumn}
                        openQuizForTask={openQuizForTask}
                        openCamera={openCamera}
                        isStatusChanging={changingTaskIds.has(task._id)}
                    />
                ))}
            </div>
        </div>
    );
});

export default TaskColumn;
